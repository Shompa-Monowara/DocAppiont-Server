const express = require('express')
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion } = require('mongodb');
  dotenv.config()
  
const uri = process.env.MONGODB_URI;
const app = express()
const PROT = process.env.PROT;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();
    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
  }
}
run().catch(console.dir);

app.get('/', (req, res) =>{
    res.send("Server is running fine!")
})

app.listen(PROT, () => {
  console.log(`Server running on port ${PROT}`)
})