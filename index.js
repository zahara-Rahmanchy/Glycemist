const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 5000;

// Parse incoming requests with JSON payloads
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

app.get("/", (req, res) => {
  console.log("Diabetes Prediction Running");
  res.send("Diabetes Prediction Running");
});

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
app.listen(port, () => {
  console.log("port:500");
});
