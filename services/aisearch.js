function fallbackSearchProcessor(query) {
  if (!query || typeof query !== "string") {
    return { productName: "", minPrice: "", maxPrice: "" };
  }

  let trimmed = query.trim();
  let minPrice = "";
  let maxPrice = "";

  // Match "under 500" / "below 500" / "less than 500" / "< 500"
  const underMatch = trimmed.match(/(?:under|below|less than|<)\s*(\d+(?:\.\d+)?)/i);
  if (underMatch) {
    maxPrice = underMatch[1];
    trimmed = trimmed.replace(underMatch[0], "").trim();
  }

  // Match "over 500" / "above 500" / "more than 500" / "> 500"
  const overMatch = trimmed.match(/(?:over|above|more than|>)\s*(\d+(?:\.\d+)?)/i);
  if (overMatch) {
    minPrice = overMatch[1];
    trimmed = trimmed.replace(overMatch[0], "").trim();
  }

  // Match "between 500 and 1000" / "500 to 1000" / "500 - 1000"
  const betweenMatch = trimmed.match(/(?:between\s*)?(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*(\d+(?:\.\d+)?)/i);
  if (betweenMatch && !underMatch && !overMatch) {
    minPrice = betweenMatch[1];
    maxPrice = betweenMatch[2];
    trimmed = trimmed.replace(betweenMatch[0], "").trim();
  }

  const productName = trimmed.replace(/\s+/g, " ").trim();

  return {
    productName,
    minPrice,
    maxPrice,
  };
}

async function processSearchQuery(query) {
  if (!query || typeof query !== "string" || query.trim() === "") {
    return { productName: "", minPrice: "", maxPrice: "" };
  }

  return fallbackSearchProcessor(query);
}

module.exports = {
  processSearchQuery,
  fallbackSearchProcessor,
};
