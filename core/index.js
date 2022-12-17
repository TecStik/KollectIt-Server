
const PORT = process.env.PORT || 5000;
const dbURI = process.env.dbURI || "mongodb+srv://tecstik:Pakvip123@cluster0.aurgg8p.mongodb.net/?retryWrites=true&w=majority";

module.exports = {
    PORT: PORT,
    dbURI: dbURI,
}