import { supabase } from "@/lib/supabase";

export async function uploadFileToSupabase(file: File, bucket: string): Promise<string> {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    if (!data) {
        throw new Error("No data returned from Supabase upload");
    }

    return supabase.storage
        .from(bucket)
        .getPublicUrl(fileName).data.publicUrl;
}
