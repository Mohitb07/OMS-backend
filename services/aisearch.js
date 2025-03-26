const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function processSearchQuery(query) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `
          You are a search query processor. Extract keywords and a price range (if a user ask under certain amount then maxPrice is that amount and minPrice is 1, if a user ask over certain amount then minPrice is that amount and maxPrice is 10000000000 and if both the values are missing then only the values must be empty string "") from the following query: "${query}".
          Format the output as a JSON object. Example: { "productName": "product name", "minPrice": "500", "maxPrice": "1000" }.
          `,
      },
    ],
  });

  const rawOutput = response.choices[0].message.content;
  console.log("Raw Output:", rawOutput);

  // Parse the raw output into JSON
  try {
    const extractedData = JSON.parse(rawOutput);
    console.log("Parsed Data:", extractedData);
    return extractedData;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null; // Handle gracefully
  }
}

module.exports = {
  processSearchQuery,
};
