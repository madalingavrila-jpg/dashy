import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { config } from "../config.js";

/** Boltable File Storage bucket for this app (IRSA — no hardcoded AWS keys). */
export const S3_BUCKET = config.s3Bucket;
export const S3_REGION = config.s3Region;

const s3 = new S3Client({
  region: S3_REGION,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5_000,
    requestTimeout: 15_000,
  }),
});

export async function putS3Object(
  key: string,
  body: string | Uint8Array | Buffer,
  contentType = "application/json",
  contentEncoding?: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(contentEncoding ? { ContentEncoding: contentEncoding } : {}),
    }),
  );
}

export async function getS3ObjectText(key: string): Promise<string | null> {
  const bytes = await getS3ObjectBytes(key);
  if (!bytes) return null;
  return Buffer.from(bytes).toString("utf8");
}

export async function getS3ObjectBytes(key: string): Promise<Buffer | null> {
  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
    if (!result.Body) return null;
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : String(error);
    if (
      name === "NoSuchKey" ||
      name === "NotFound" ||
      message.includes("NoSuchKey") ||
      message.includes("NotFound") ||
      (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

/** True when IRSA/env looks like Boltable production (S3 should be attempted). */
export function isS3LikelyAvailable(): boolean {
  return Boolean(
    process.env.AWS_ROLE_ARN ||
      process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
      process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI ||
      process.env.BOLTABLE_FILE_STORAGE === "1",
  );
}
