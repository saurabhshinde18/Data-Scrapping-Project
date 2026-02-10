export const readJson = async (url, options) => {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!text) {
    return { response, data: null };
  }
  try {
    const data = JSON.parse(text);
    return { response, data };
  } catch {
    return { response, data: null, text };
  }
};
