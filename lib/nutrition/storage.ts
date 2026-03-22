import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64Decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

export type NutritionSubmissionPhotoKind =
  | 'nutrition_facts'
  | 'ingredients'
  | 'front_package';

export type UploadedNutritionSubmissionPhoto = {
  kind: NutritionSubmissionPhotoKind;
  path: string;
  publicUrl: string;
};

const STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_SUPABASE_NUTRITION_SUBMISSIONS_BUCKET || 'profile-photos';

function getFileExt(uri: string) {
  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase();
  return ext || 'jpg';
}

function getImageContentType(fileExt: string) {
  switch (fileExt.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

export async function uploadNutritionSubmissionPhoto(args: {
  userId: string;
  localUri: string;
  kind: NutritionSubmissionPhotoKind;
}): Promise<UploadedNutritionSubmissionPhoto> {
  const { userId, localUri, kind } = args;

  const fileExt = getFileExt(localUri);
  const fileName = `${kind}-${Date.now()}.${fileExt}`;
  const filePath = `nutrition-submissions/${userId}/${fileName}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  const arrayBuffer = base64Decode(base64);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, arrayBuffer, {
      upsert: true,
      contentType: getImageContentType(fileExt),
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return {
    kind,
    path: filePath,
    publicUrl: publicUrlData.publicUrl,
  };
}
