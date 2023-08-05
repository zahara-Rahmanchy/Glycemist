const express = require("express");
const cors = require("cors");
const axios = require("axios");
const pdfkit = require("pdfkit");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const moment = require("moment");

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

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
  console.log(req.body);
  const {firstform, secondform} = req.body;
  // const secondform = req.secondform;
  // console.log("firstform:", firstform, "secondform", secondform);
  // res.send("ok");
  try {
    let p1, p2;
    try {
      // Make a POST request to the Render.com API,-health-indicators
      const apiUrl =
        "https://diabetesprediction-health-indicators.onrender.com/gbsylpredict";
      const response = await axios.post(apiUrl, firstform);
      p1 = response.data.prediction;
      console.log("Response:", p1);
    } catch (error) {
      console.error("Error making the first API request:", error.message);
    }

    try {
      // Make a POST request to the second API, sylhet diabetes dataset api
      const apiUrl2 = "https://sylhetdiabetes.onrender.com/gradientBsylhet";
      const response2 = await axios.post(apiUrl2, secondform);
      p2 = response2.data.prediction;
      console.log("Response2:", p2);
    } catch (error) {
      console.error("Error making the second API request:", error.message);
    }

    let result;
    if (p1 == 0 && p2 == "Negative") {
      res.status(200).send({risk: 0}); //no risk
    } else if ((p1 == 0 && p2 == "Positive") || (p1 == 1 && p2 == "Negative")) {
      res.status(200).send({risk: 1}); //medium
    } else if (p1 == 1 && p2 == "Positive") {
      res.status(200).send({risk: 2}); //high
    }

    // const prediction = response.data;
    // console.log(response, "\nresponse2", response2);
    // res.send(prediction);
  } catch (error) {
    console.error("Error making prediction:", error.message);
    res.status(500).send({error: "Something went wrong"});
  }
});
// ---------------------------------------Prediction end------------------------------------------------------------------------

function sendNotification(token, medicineName) {
  const messaging = firebaseAdmin.messaging();
  const message = {
    token,
    notification: {
      title: `Time to take ${medicineName}`,
      body: `It's time to take your medicine ${medicineName}`,
    },
  };

  messaging
    .send(message)
    .then(response => {
      console.log("Successfully sent message:", response);
    })
    .catch(error => {
      // console.log("Error sending message:", error);
    });
}

// ------------------------------------MongoDb-----------------------------------------------------------------------

const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
const {response} = require("express");
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
    const appointmentsCollection = client
      .db("Glycmeist")
      .collection("appointments");

    // saving users to db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      //console.log("user", user)
      // console.log("existingUser:  ", existingUser);
      if (existingUser) {
        return res.send({message: "The User already exits"});
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // ------------------------------------checking current user and sending data for user profile---------------------------------

    app.get("/user/:email", async (req, res) => {
      const user = await usersCollection.findOne({email: req.params.email});
      res.send(user);
    });

    // -------------------------------------------------------------------------------------
    // -------------------------------------------------------------------------------------------------------------

    // ... (existing code)

    // -------------------------------------------------------------------------------------
    // -------------------------------------------------------------------------------------------------------------

    //-------------------------------------  CHECK ADMIN to get data using email--------------------------------------------------------------------------
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email};

      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === "admin"};
      res.send(result);
    });
    // shows all users to admin
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
        // console.log(result);
        res.send(result);
      }
    });

    // shows all doctors to admin and their approve status
    app.get("/alldoctors", async (req, res) => {
      const email = req.query.email;
      // console.log("email: ", email);
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      if (user?.role == "admin") {
        const result = await usersCollection.find({role: "doctor"}).toArray();
        console.log(result);
        res.send(result);
      } else {
        console.log("wrong user", user);
        return res.status(403).send({error: true, message: "Forbidden access"});
      }
    });

    // -----------------------------TO approve doctors by clicking approve-----------------------------------------------------
    app.patch("/doctors/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const clicked = req.body.clicked;
      // console.log("role", role);
      const query = {_id: new ObjectId(id)};

      const updatedDoc = {
        $set: {
          status: status,
          clicked: clicked,
        },
      };

      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    // -----------------------------------------delete user----------------------------------------------------------------------
    // $or operator to check if the "id" matches either directly as a string or as an ObjectId

    app.delete("/deletedoctor/:id", async (req, res) => {
      const id = req.params.id;

      const query = {$or: [{_id: id}, {_id: new ObjectId(id)}]};
      const result = await usersCollection.deleteOne(query);
      console.log("query", query, "result", result);
      res.send(result);
    });
    // --------------------------------------------------------------------------------------------------------
    // --------------------------------------- and check doctors----------------------------------------------hook

    app.get("/users/doctor/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email, status: "approved"};

      const user = await usersCollection.findOne(query);
      const result = {doctor: user?.role === "doctor"};
      res.send(result);
    });
    // -------------------------------------------------------Showing doctors list to users------------------------------------
    app.get("/doctors", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const query = {role: "doctor", status: "approved"};
      const alldoctorsapproved = await usersCollection.find(query).toArray();

      // const user = await usersCollection.findOne(query);
      // const result = {admin: user?.role === "admin"};
      console.log(alldoctorsapproved);
      res.send(alldoctorsapproved);
    });

    // --------------------------------------------Patient's/users Dashboard--------------------------------------------------------------
    // charts
    app.patch("/patient/:email", async (req, res) => {
      const email = req.params.email;
      const values = req.body;
      // console.log("values: ", values);

      // Create the query filter using the email
      const query = {email: email};
      const user = await usersCollection.findOne(query);

      let newData;

      // // If systolic and diastolic values are present, add them to bloodPressure array
      if (values.systolic && values.diastolic) {
        newData = {
          systolic: values.systolic,
          diastolic: values.diastolic,
          date: values.date,
        };
        if (!user.bloodPressure) {
          user.bloodPressure = [newData];
        } else {
          user.bloodPressure.push(newData);
        }
      }

      // If bloodSugar value is present, add it to bloodSugar array
      if (values.bloodsugar) {
        newData = {
          bloodsugar: values.bloodsugar,
          date: values.date,
        };
        if (!user.bloodSugar) {
          user.bloodSugar = [newData];
        } else {
          user.bloodSugar.push(newData);
        }
      }
      if (values.HbA1c) {
        newData = {
          HbA1c: values.HbA1c,
          date: values.date,
        };
        if (!user.HbA1c) {
          user.HbA1c = [newData];
          console.log("from if", user.HbA1c);
        } else {
          user.HbA1c.push(newData);
          console.log("from else", user.HbA1c);
        }
      }
      if (values.RBS) {
        newData = {
          RBS: values.RBS,
          date: values.date,
        };

        if (!user.RBS) {
          user.RBS = [newData];
          console.log("from if", user.RBS);
        } else {
          user.RBS.push(newData);
          console.log("from else", user.RBS);
        }
      }
      const result = await usersCollection.updateOne(query, {
        $set: {
          bloodSugar: user.bloodSugar,
          bloodPressure: user.bloodPressure,
          RBS: user.RBS,
          HbA1c: user.HbA1c,
        },
      });

      console.log(result);

      res.send(result);
    });

    // -------------------------------------------------fetch to show in graph-------------------------------------------------------
    app.get("/myhealth/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = {email: email};
        const user = await usersCollection.findOne(query);

        if (!user) {
          // If user is not found, return an empty object or an error message.
          return res.status(404).send({message: "User not found"});
        }

        const response = {};

        if (user.bloodPressure) {
          // sorting the date
          user.bloodPressure.sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          response.bloodPressure = user.bloodPressure;
        }

        if (user.bloodSugar) {
          user.bloodSugar.sort((a, b) => new Date(a.date) - new Date(b.date));
          response.bloodSugar = user.bloodSugar;
        }
        if (user.HbA1c) {
          user.HbA1c.sort((a, b) => new Date(a.date) - new Date(b.date));
          response.HbA1c = user.HbA1c;
        }
        if (user.RBS) {
          user.RBS.sort((a, b) => new Date(a.date) - new Date(b.date));
          response.RBS = user.RBS;
        }

        res.send(response);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Handle the error, e.g., send an error response with status code 500
        res.status(500).send({message: "Internal Server Error"});
      }
    });

    // -----------------------------------------------TO ADD Medicine-------------------------------------------------------------------
    app.patch("/medicine/:email", async (req, res) => {
      const email = req.params.email;
      const filter = {email: email};
      const {medicines} = req.body;
      console.log(req.body);
      const updateResult = await usersCollection.findOneAndUpdate(
        filter,
        {$addToSet: {medicines: {$each: medicines}}},
        {returnOriginal: false}
      );

      // console.log(updateResult);

      res.send(updateResult);
    });

    // --------------------------------------------show medicine list------------------------------------------------------------
    app.get("/medicines/:email", async (req, res) => {
      const email = req.params.email;

      const query = {email: email};
      const med = await usersCollection.findOne(query);
      // const {medicines} = user;
      // console.log("med", med.medicines);
      res.send(med);
    });
    // --------------------------------------------save prediction result --------------------------------------------------------
    app.patch("/save-risk/:email", async (req, res) => {
      const {value} = req.body;
      console.log(value);
      const query = {email: req.params.email};

      let risk;
      if (value == 0) {
        risk = "No Risk";
      }
      if (value == 1) {
        risk = "Moderate Risk";
      }
      if (value == 2) {
        risk = "High Risk";
      }
      const doc = {
        $set: {risk: risk},
      };
      const updated = await usersCollection.updateOne(query, doc);

      res.send(updated);
    });

    // -----------------------------------------------To store appointments------------------------------------------------------------
    // POST route to handle file upload and form data

    app.post("/appointment", async (req, res) => {
      const appointmentData = req.body;

      console.log("appointment", appointmentData);
      // console.log("existingUser:  ", existingUser);

      const result = await appointmentsCollection.insertOne(appointmentData);
      res.send(result);
    });

    // ---------------------------------------------------------------------------------------------------------------------------
    // ------------------------------------------Doctor's dashboard--------------------------------------------------------------

    // all appointments
    app.get("/appointments/:email", async (req, res) => {
      const email = req.params.email;
      const type = req.query.type;
      console.log("email: ", email, "type", type);
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const ap = await appointmentsCollection
        .find({patientEmail: email})
        .toArray();
      console.log(ap);
      if (user?.role == "doctor") {
        const result = await appointmentsCollection
          .find({doctorEmail: email})
          .sort({date: -1})
          .toArray();
        res.send(result);

        // console.log(result);
      } else {
        const result = await appointmentsCollection
          .find({patientEmail: email})
          .sort({date: -1})
          .toArray();
        console.log(result);
        res.send(result);
      }
    });

    // NOTIFICATIon---------------------------------------------------------------------------------

    app.post("/store-fcm-token/:email", async (req, res) => {
      const {email} = req.params;
      const {token} = req.body;
      // Store the FCM token in the database for the user
      await usersCollection.updateOne(
        {email: email},
        {$set: {token}},
        // { upsert: true },
        (err, result) => {
          if (err) {
            console.error("Error storing FCM token:", err);
            res.status(500).json({error: "Failed to store FCM token"});
          } else {
            console.log("FCM token stored:", token);
            res.sendStatus(200);
          }
        }
      );
    });

    // ------------tsrt---------------------
    app.get("/generate-pdf/:email", async (req, res) => {
      const user = await usersCollection.findOne({email: req.params.email});
      console.log("user: ", user);
      res.send(user);
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
