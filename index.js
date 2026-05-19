const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const db = client.db("docappointdb"); 
const doctorsCollection = db.collection("doctors"); 
const appointmentsCollection = db.collection("appointments"); 


app.get("/all-appointments", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { specialty: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const result = await doctorsCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});



app.get("/all-appointments/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const query = { _id: new ObjectId(doctorId) }; 
    const result = await doctorsCollection.findOne(query);
    
    if (!result) {
      return res.status(404).send({ message: "Doctor not found" });
    }
    res.send(result);
  } catch (error) {
    console.error("Error fetching single doctor:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});



app.post("/appointments", async (req, res) => {
  try {
    const bookingData = req.body;
    

    const result = await appointmentsCollection.insertOne(bookingData);
    
    res.status(201).send({ 
      success: true, 
      message: "Appointment booked successfully!", 
      insertedId: result.insertedId 
    });
  } catch (error) {
    console.error("Error saving appointment:", error);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});



async function run() {
  try {
    console.log("Successfully connected to MongoDB cluster!");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send("DocAppoint Server is running fine!");
});



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});