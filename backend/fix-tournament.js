const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/TennisTournamentManagement")
  .then(() => {
    console.log("Connected to MongoDB");
    return updateTournament();
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

async function updateTournament() {
  try {
    const result = await mongoose.connection.db.collection("tournaments").updateOne(
      { _id: new mongoose.Types.ObjectId("6868e8c02f95d7cdb5ccbb7c") },
      { $set: { requiredCourts: 1 } }
    );
    
    console.log("Update result:", result);
    
    const tournament = await mongoose.connection.db.collection("tournaments").findOne(
      { _id: new mongoose.Types.ObjectId("6868e8c02f95d7cdb5ccbb7c") }
    );
    
    console.log("Updated tournament requiredCourts:", tournament?.requiredCourts);
    
    mongoose.connection.close();
    console.log("✅ Tournament updated successfully\!");
  } catch (error) {
    console.error("❌ Error updating tournament:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}
