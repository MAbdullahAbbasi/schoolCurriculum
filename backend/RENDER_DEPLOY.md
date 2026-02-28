# Deploying to Render – MongoDB connection

## 1. Set `MONGO_URI` on Render

- In Render: open your **Service** → **Environment**.
- Add (or edit) **MONGO_URI**.
- Value: your full MongoDB Atlas connection string, e.g.  
  `mongodb+srv://USER:PASSWORD@sapling.smzsvn.mongodb.net/?retryWrites=true&w=majority`  
  (replace USER, PASSWORD, and host with the exact string from Atlas).

The app uses the database name **SchoolCurriculum**; you can omit it from the URI and the server will add it.

## 2. If you see `querySrv ENOTFOUND _mongodb._tcp....`

This means the hostname in your URI could not be resolved (DNS failure). Try:

**A. Check the hostname in Atlas**

- In MongoDB Atlas: **Database** → **Connect** → **Connect your application**.
- Copy the connection string again and confirm the host (e.g. `sapling.smzsvn.mongodb.net`) matches your cluster.
- If the cluster was recreated or renamed, the host will be different; use the new one.

**B. Use the standard connection string (no SRV)**

Some environments have trouble resolving `mongodb+srv://` (SRV) hostnames. In that case use the **standard** URI:

- In Atlas: **Database** → **Connect** → **Connect using MongoDB Compass** (or **Drivers**).
- Copy the **standard** URI that looks like:  
  `mongodb://USER:PASSWORD@host1:27017,host2:27017,.../SchoolCurriculum?replicaSet=...`
- Set that full string as **MONGO_URI** on Render (the server accepts both `mongodb://` and `mongodb+srv://`).

**C. Network Access in Atlas**

- In Atlas: **Network Access** → ensure Render’s outbound IPs are allowed, or temporarily use **Allow access from anywhere** (`0.0.0.0/0`) for testing.

## 3. Redeploy

After changing **MONGO_URI** (or any env var) on Render, trigger a new deploy so the new value is used.
