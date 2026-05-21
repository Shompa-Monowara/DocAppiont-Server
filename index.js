const express = require ('express');
const dotenv = require ('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized: Missing Header" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing Token" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload; 
    console.log("Verified User:", payload.email);
    next();
  } catch (error) {
    console.error("JWT Error:", error.message);
    return res.status(403).json({ message: "Forbidden Access" });
  }
};

async function run() {
  try {
  
    await client.connect();
    console.log(" Connected to MongoDB successfully!");

    const db = client.db("docappointdb");
    const doctorsCollection = db.collection("doctors");
    const appointmentsCollection = db.collection("appointments");
    const usersCollection = db.collection("users"); // 👤 ইউজার প্রোফাইল কালেকশন


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
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/all-appointments/:doctorId", async (req, res) => {
      try {
        const { doctorId } = req.params;
        const query = { _id: new ObjectId(doctorId) };
        const result = await doctorsCollection.findOne(query);
        if (!result) return res.status(404).send({ message: "Doctor not found" });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal server error" });
      }
    });

 
    app.post("/appointments", verifyToken, async (req, res) => {
      try {
        const bookingData = req.body;
        bookingData.userEmail = req.user.email; 

        const result = await appointmentsCollection.insertOne(bookingData);
        res.status(201).send({
          success: true,
          message: "Appointment booked successfully!",
          insertedId: result.insertedId
        });
      } catch (error) {
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

    // Get Logged-in User's Appointments
    app.get("/appointments", verifyToken, async (req, res) => {
      try {
        const email = req.user.email; 
        const result = await appointmentsCollection.find({ userEmail: email }).toArray();
        res.send({ success: true, appointments: result });
      } catch (error) {
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

   
    app.put("/booking/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const userEmail = req.user.email;
        const updatedData = req.body;

     
        delete updatedData._id;
        delete updatedData.userEmail;

        const filter = { _id: new ObjectId(id), userEmail: userEmail };
        const updateDoc = {
          $set: updatedData,
        };

        const result = await appointmentsCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ success: false, message: "Appointment not found or unauthorized" });
        }

        res.json({ success: true, message: "Appointment updated successfully!" });
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });


    app.delete("/booking/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const userEmail = req.user.email;

        const result = await appointmentsCollection.deleteOne({
          _id: new ObjectId(id),
          userEmail: userEmail 
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ success: false, message: "Appointment not found or unauthorized" });
        }
        res.json({ success: true, message: "Appointment deleted successfully" });
      } catch (error) {
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

  
    app.put("/user/update", verifyToken, async (req, res) => {
      try {
        const userEmail = req.user.email; // টোকেন থেকে ইমেইল নেওয়া হচ্ছে
        const { name, image } = req.body;

        const filter = { email: userEmail };
        const updateDoc = {
          $set: {
            name: name,
            image: image,
            updatedAt: new Date()
          }
        };

       
        const result = await usersCollection.updateOne(filter, updateDoc, { upsert: true });

        res.json({ 
          success: true, 
          message: "Profile updated successfully!",
          result 
        });
      } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("DocAppoint Server is running perfectly for Vercel!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});