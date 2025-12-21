export async function safeJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(
      `JSON Parse Error for ${response.url} (${response.status}):`,
      error,
    );
    const preview = text.substring(0, 1000);
    console.error("Raw Response Preview:", preview);
    throw new Error(
      `Failed to parse JSON from ${response.url} (${response.status}): ${preview}`,
    );
  }
}
