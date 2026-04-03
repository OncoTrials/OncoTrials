
require('dotenv').config();
const { pullTrialsFromDB } = require("../services/ai/protocolParser");

(async () => {
  const trials = await pullTrialsFromDB();
  console.log("Fetched trials:", trials?.length);
})();
