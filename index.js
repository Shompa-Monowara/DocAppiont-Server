const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://docAppoint:Q2hp4ydrHRMiWdjL@cluster0.oamcsmh.mongodb.net/?appName=Cluster0";
const app = express()
const PROT = 5000

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