// Video thumbnail + metadata generation using ffmpeg
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { promises as fs } from "fs";
import { PATHS, getStorageRelativePath } from "./storage";

const execAsync = promisify(exec);

export interface VideoMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Generate a thumbnail from a video at ~1 second in.
 * Returns the relative storage path of the thumbnail.
 */
export async function generateVideoThumbnail(videoAbs: string, mediaId: string): Promise<{ thumbnailRel: string; duration: number | null; width: number | null; height: number | null }> {
  const thumbName = `${mediaId}.jpg`;
  const thumbAbs = path.join(PATHS.THUMBNAILS, thumbName);
  await fs.mkdir(PATHS.THUMBNAILS, { recursive: true });

  try {
    // Generate thumbnail at 1 second mark (or 10% of duration if short)
    await execAsync(
      `ffmpeg -y -i "${videoAbs}" -ss 00:00:01 -vframes 1 -vf "scale=480:-2" -q:v 4 "${thumbAbs}"`,
      { timeout: 30000 }
    );
  } catch {
    // Fallback: try at 0 seconds
    try {
      await execAsync(
        `ffmpeg -y -i "${videoAbs}" -vframes 1 -vf "scale=480:-2" -q:v 4 "${thumbAbs}"`,
        { timeout: 30000 }
      );
    } catch (e) {
      console.error("Video thumbnail generation failed:", e);
      return { thumbnailRel: "", duration: null, width: null, height: null };
    }
  }

  // Get duration + dimensions via ffprobe
  let duration: number | null = null;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "${videoAbs}"`,
      { timeout: 15000 }
    );
    const parts = stdout.trim().split(",");
    if (parts.length >= 3) {
      width = parseInt(parts[0], 10) || null;
      height = parseInt(parts[1], 10) || null;
      duration = parseFloat(parts[2]) || null;
    }
  } catch {
    // ffprobe not available or failed — non-fatal
  }

  return {
    thumbnailRel: getStorageRelativePath(thumbAbs),
    duration,
    width,
    height,
  };
}

/**
 * Generate a specific thumbnail at a custom timestamp (for admin manual selection).
 */
export async function generateVideoThumbnailAtTime(
  videoAbs: string,
  mediaId: string,
  timeSeconds: number
): Promise<string> {
  const thumbName = `${mediaId}.jpg`;
  const thumbAbs = path.join(PATHS.THUMBNAILS, thumbName);
  await fs.mkdir(PATHS.THUMBNAILS, { recursive: true });
  const ts = formatTimecode(timeSeconds);
  await execAsync(
    `ffmpeg -y -ss ${ts} -i "${videoAbs}" -vframes 1 -vf "scale=480:-2" -q:v 4 "${thumbAbs}"`,
    { timeout: 30000 }
  );
  return getStorageRelativePath(thumbAbs);
}

function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
