import JSZip from "jszip";

export async function extractDocumentXmlFromDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const entry = zip.file("word/document.xml");
    if (!entry) throw new Error("word/document.xml을 찾을 수 없습니다.");
    return entry.async("string");
}
