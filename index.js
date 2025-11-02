require("dotenv").config();
const cors = require("cors");
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
// 🔹 Middleware
app.use(cors());
app.use(express.json());

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

    // Create a products Collection (POST)
    app.post("/products", async (req, res) => {
      try {
        const products = await productsCollection.insertOne(req.body);
        res.status(201).json(products);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    //Get alldata
    app.get("/products", async (req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //Get a single data
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });


    //Update Product
    app.patch("/products/:id", async (req, res) => {
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
    app.delete("/products/:id", async (req, res) => {
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
