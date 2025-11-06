require("dotenv").config();
const cors = require("cors");
const express = require("express");
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

const serviceAccount = require("./smart-deals-firebase-adminsdk.json.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 🔹 Middleware
app.use(cors());
app.use(express.json());
// Firebase tokan verify
const VerifyFireBaseTokan = async (req, res, next) => {
  const headerAuth = req.headers.authorization;

  if (!headerAuth) {
    //do not allow to go
    return res.status(401).send({ message: "Unothorized access" });
  }
  const token = headerAuth.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unothorized access" });
  }
  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unothorized access" });
  }
};

const uri = process.env.MONGODB_URL;

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
    //create database and collection
    const db = client.db("smart_db");
    const productsCollection = db.collection("products");
    const bidsCollection = db.collection("bids");
    const userCollection = db.collection("users");

    // Post/create user information
    app.post("/user", async (req, res) => {
      const { email } = req.body;
      // Check if user already exists
      const existingUser = await userCollection.findOne({ email });
      if (!existingUser) {
        const newUser = req.body;
        await userCollection.insertOne(newUser);
        return res.status(201).json({ message: "New user added" });
      } else {
        return res.status(200).json({ message: "User already exists" });
      }
    });

    // Create a products Collection (POST)
    app.post("/products", async (req, res) => {
      try {
        const products = await productsCollection.insertOne(req.body);
        res.status(201).json(products);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    //Get bids (GET)
    app.get("/bids", VerifyFireBaseTokan, async (req, res) => {
      const email = req.query.email;
      const query = {};

      if (email) {
        if (email !== req.token_email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        query.buyerEmail = email;
      }

      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Create a bids Collection (POST)
    app.post("/bids", async (req, res) => {
      try {
        const bids = await bidsCollection.insertOne(req.body);
        res.status(201).json(bids);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    //Get all Products
    app.get("/allproducts", async (req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get latest products
    app.get("/latest-products", async (req, res) => {
      const cursor = productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    //Get a single data
    app.get("/allproducts/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    //Get bids for a single product
    app.get("/allproducts/bids/:productid", async (req, res) => {
      const id = req.params.productid;
      const query = { ProductId: id };
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //Update Product
    app.patch("/allproducts/:id", async (req, res) => {
      const id = req.params.id;
      const updateProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateProduct,
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    //Delete a product
    app.delete("/allproducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // This delete method is more relaible
    //     app.delete("/books/:id", async (req, res) => {
    //   try {
    //     const result = await booksCollection.deleteOne({
    //       _id: new ObjectId(req.params.id),
    //     });

    //     if (result.deletedCount === 0) {
    //       return res.status(404).json({ message: "Book not found" });
    //     }

    //     res.json({ message: "Book deleted successfully" });
    //   } catch (err) {
    //     res.status(500).json({ error: err.message });
    //   }
    // });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Smart deals service");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
