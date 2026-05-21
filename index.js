const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;



app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());



const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);



const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({
        success: false,
        message: 'Unauthorized Access',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).send({
        success: false,
        message: 'Unauthorized Access',
      });
    }

    const { payload } = await jwtVerify(token, JWKS);

    req.user = payload;

    next();
  } catch (error) {
    console.error('JWT Verify Error:', error);

    return res.status(401).send({
      success: false,
      message: 'Unauthorized Access',
    });
  }
};



async function run() {
  try {
    await client.connect();

    console.log(' MongoDB Connected');

    const db = client.db('docappointdb');

    const doctorsCollection = db.collection('doctors');
    const appointmentsCollection = db.collection('appointments');
    const usersCollection = db.collection('users');

    

    app.get('/all-appointments', async (req, res) => {
      try {
        const { search } = req.query;

        let query = {};

        if (search) {
          query = {
            $or: [
              {
                name: {
                  $regex: search,
                  $options: 'i',
                },
              },
              {
                specialty: {
                  $regex: search,
                  $options: 'i',
                },
              },
            ],
          };
        }

        const result = await doctorsCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    });


    app.get('/all-appointments/:doctorId', async (req, res) => {
      try {
        const { doctorId } = req.params;

        const result = await doctorsCollection.findOne({
          _id: new ObjectId(doctorId),
        });

        if (!result) {
          return res.status(404).send({
            success: false,
            message: 'Doctor Not Found',
          });
        }

        res.send(result);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    });

  

    app.post('/appointments', verifyToken, async (req, res) => {
      try {
        const bookingData = req.body;

        bookingData.userEmail = req.user.email;

        bookingData.createdAt = new Date();

        const result = await appointmentsCollection.insertOne(bookingData);

        res.status(201).send({
          success: true,
          message: 'Appointment Booked Successfully',
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    });

   

    app.get('/appointments', verifyToken, async (req, res) => {
      try {
        const email = req.user.email;

        const result = await appointmentsCollection
          .find({
            userEmail: email,
          })
          .toArray();

        res.send({
          success: true,
          appointments: result,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    });

   

    app.put('/booking/:id', verifyToken, async (req, res) => {
      try {
        const { id } = req.params;

        const updatedData = req.body;

        delete updatedData._id;
        delete updatedData.userEmail;

        const result = await appointmentsCollection.updateOne(
          {
            _id: new ObjectId(id),
            userEmail: req.user.email,
          },
          {
            $set: {
              ...updatedData,
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: 'Appointment Not Found',
          });
        }

        res.send({
          success: true,
          message: 'Appointment Updated Successfully',
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    });

   

    app.delete('/booking/:id', verifyToken, async (req, res) => {
      try {
        const { id } = req.params;

        const result = await appointmentsCollection.deleteOne({
          _id: new ObjectId(id),
          userEmail: req.user.email,
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: 'Appointment Not Found',
          });
        }

        res.send({
          success: true,
          message: 'Appointment Deleted Successfully',
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    });

   

    app.put('/user/update', verifyToken, async (req, res) => {
      try {
        const { name, image } = req.body;

        const result = await usersCollection.updateOne(
          {
            email: req.user.email,
          },
          {
            $set: {
              email: req.user.email,
              name,
              image,
              updatedAt: new Date(),
            },
          },
          {
            upsert: true,
          }
        );

        res.send({
          success: true,
          message: 'Profile Updated Successfully',
          result,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
    });

    console.log(' All Routes Ready');
  } catch (error) {
    console.error('MongoDB Error:', error);
  }
}

run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('DocAppoint Server Running');
});



app.listen(PORT, () => {
  console.log(` Server Running On Port ${PORT}`);
});