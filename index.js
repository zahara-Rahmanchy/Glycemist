const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// Parse incoming requests with JSON payloads
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

app.get("/", (req, res) => {
  console.log("Diabetes Prediction Running");
  res.send("Diabetes Prediction Running");
});

// -----------------------------------------Prediction api------------------------------------------------------------------------

app.post("/make-predictiongbhi", async (req, res) => {
  console.log(req);
  try {
    const data = req.body;
    // const data = {
    //   HighBP: 1,
    //   HighChol: 0,
    //   BMI: 26.0,
    //   HeartDiseaseorAttack: 0,
    //   PhysActivity: 1,
    //   Fruits: 0,
    //   Veggies: 1,
    //   GenHlth: 3,
    //   MentHlth: 5.0,
    //   PhysHlth: 30.0,
    //   Sex: 1,
    //   Age: 4,
    //   Education: 6,
    //   Income: 8,
    // };

    console.log("Input Data:", data); // Log the input data
    console.log(data);
    // Make a POST request to the Render.com API
    const apiUrl =
      "https://diabetesprediction-health-indicators.onrender.com/gbsylpredict";
    const response = await axios.post(apiUrl, data);

    const prediction = response.data;
    console.log(response);
    res.send(prediction);
  } catch (error) {
    console.error("Error making prediction:", error.message);
    res.status(500).send({error: "Something went wrong"});
  }
});
// ---------------------------------------Prediction end------------------------------------------------------------------------

// ------------------------------------MongoDb-----------------------------------------------------------------------

const {MongoClient, ServerApiVersion} = require("mongodb");
const uri = `mongodb+srv://${process.env.GLYDB_USERNAME}:${process.env.GLYDB_PASS}@cluster0.ofsmeh8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("Glycmeist").collection("users");

    // creating the verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      // const email = req.decoded.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({error: true, message: "Forbidden access"});
      }
      next();
    };
    // saving users to db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      console.log("user", user);
      // console.log("existingUser:  ", existingUser);
      if (existingUser) {
        return res.send({message: "The User already exits"});
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    //-------------------------------------  CHECK ADMIN to get data using email--------------------------------------------------------------------------
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email};

      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === "admin"};
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const email = req.query.email;
      console.log("email: ", email);
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        console.log("wrong user");
        return res.status(403).send({error: true, message: "Forbidden access"});
      } else {
        const result = await usersCollection.find().toArray();
        console.log(result);
        res.send(result);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ping: 1});
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("port:500");
});
