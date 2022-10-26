
const PORT = process.env.PORT || 5000;
const dbURI = process.env.dbURI || "mongodb+srv://kollectit:1234@kollectit.ig3fyvk.mongodb.net/?retryWrites=true&w=majority";

module.exports = {
    PORT: PORT,
    dbURI: dbURI,
}