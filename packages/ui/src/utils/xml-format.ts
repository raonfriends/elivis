/** XML 문자열을 들여쓰기하여 가독성 있게 포맷 */
export function formatXml(xml: string): string {
    const trimmed = xml.trim();
    if (!trimmed) return trimmed;

    const lines = trimmed
        .replace(/>\s*</g, ">\n<")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    let depth = 0;
    const indent = "  ";
    const result: string[] = [];

    for (const line of lines) {
        const isClosing = line.startsWith("</");
        const isSelfClosing = line.endsWith("/>");

        if (isClosing) {
            depth = Math.max(0, depth - 1);
        }

        result.push(indent.repeat(depth) + line);

        if (!isClosing && !isSelfClosing && line.startsWith("<")) {
            depth++;
        }
    }

    return result.join("\n");
}
