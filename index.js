const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

// verify Token middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qrif73o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    // mongodb collaction 
    const requestsCollection = client.db('bloodBank').collection('requests');
    const usersCollection = client.db("bloodBank").collection('users');
    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    });

    // save a user data 
    app.put('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email }
    
           // save the user for the first time
           const options = { upsert: true };
           const updateDoc = {
             $set: {
               ...user,
               timestamp: Date.now(),
     
             }
           }
           const result = await usersCollection.updateOne(query, updateDoc, options);
           res.send(result)
         })


    // donation reqest related api 
    app.post('/request', async (req, res) => {
      const request = req.body;
      const result = await requestsCollection.insertOne(request);
      res.send(result);
    })


    // get all donation request
    app.get('/all-requests', async (req, res) => {
      const result = await requestsCollection.find().toArray();
      res.send(result)
    });

    // Get a single request data from db using id
    app.get('/request/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await requestsCollection.findOne(query)
      res.send(result)
    });

      // Get all users data
      app.get('/users',  async (req, res) => {
        const result = await usersCollection.find().toArray()
        res.send(result)
      })


    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {

  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Blood bank is running')
})

app.listen(port, () => {
  console.log(`Blood bank is running on port ${port}`)
})
