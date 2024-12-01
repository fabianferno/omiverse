## Inspiration

The inspiration behind omiverse came from a desire to bring to life a brilliant technology which was featured in this film called, "Transcendence" - starring Johnny Depp. In this movie Johnny Depp, an AI scientist - comes up with a way to create a digital copy of his consiousness by capturing all his memories. When I first saw the demo of an omi device - this struck my mind immediately. We could use omi to start training a "second brain" which grows as we use it - essentially a memory engine. 

![Screenshots](https://i.ibb.co/mzFwKWr/Screenshot-2024-12-01-104520.png)


## What It Does

Omiverse transforms the continuous stream of transcripts and moments captured by the Omi wearable into a dynamic, personalized knowledge graph. It identifies key entities (people, places, things - nouns) and relationships from your daily interactions (actions), constructing a visual map of your experiences beginning to build a "second brain" with this graph. With Omiverse, you can:

- **Talk to your second brain** using natural language to recall past events, conversations, or interactions. Built over a easy to use telegram mini app to make this seamless 
- **Visualize neurons** between different aspects of your life through an interactive, dynamic graph.
- **Mint and share memories** of your knowledge graph as NFTs, allowing you to share meaningful experiences securely. 
- **Enhance self-understanding**, effectively acting as a second-brain that learns and grows with you.

![Screenshots](https://i.ibb.co/NpH4pDZ/Screenshot-2024-12-01-110622.png)

## Setup

- Setup Guide avaialble [here](https://github.com/fabianferno/omiverse/edit/main/setup.md)





## How We Built It

1. **Data Collection and Storage**
   - The omiverse webhook stores transcripts in MongoDB, along with generated embeddings for semantic understanding.

2. **Natural Language Processing**
   - We developed a grammar engine to parse transcript chunks into topics, entities (nouns), and relationships (actions).
   - Utilized advanced NLP techniques to extract meaningful information for the knowledge graph. 
   - Represented entities as nodes and relationships as edges in a mongo graph datastore.
   - Created backend endpoints to serve nodes and edges for visualization and querying.

3. **RAG Query Engine Implementation**
   - Implemented a Retrieval Augmented Generation system to handle natural language queries.
   - Enabled dynamic adjustments of the graph based on user queries, displaying relevant information.

4. **Visualization and User Interface**
   - Built an interactive web interface using graph visualization libraries like Apache echarts.js.
   - Allowed users to explore their knowledge graph, see connections, and interact with the data in real-time using a <strong>Telegram mini app</strong>

6. **NFT Integration**
   - Enabled minting of knowledge graph segments as NFTs - powered by Zora network.

## Challenges We Ran Into

- **Real-Time Data Processing**
  - Handling continuous streams of transcripts without latency.
  - **Solution:** Implemented asynchronous processing and optimized database queries for efficiency.

- **Accurate Entity and Relationship Extraction**
  - Dealing with the complexities of natural, informal speech. Identifying context aware names of the first, second and third person. 
  - **Solution:** Employed and fine-tuned advanced NLP models to improve extraction accuracy.

- **Scalability**
  - Ensuring the system remains responsive as the knowledge graph grows.
  - **Solution:** Leveraged scalable mongo cloud infrastructure and efficient data indexing strategies.
 

## Accomplishments That We're Proud Of

- **Creating a Second Brain**
  - Successfully transformed passive audio transcripts into an interactive and meaningful knowledge base. 
  - Achieved high accuracy in extracting entities and relationships from conversational speech by NLP techniques.

- **Real-Time, Dynamic Visualization**
  - Developed an intuitive interface that dynamically adjusts to user queries and highlights relevant information. 

## What We Learned 

- **Scalability Must Be a Forethought**
  - Designing scalable systems from the beginning prevents future technical debt and bottlenecks. 

## What's Next for Omiverse 

- **Enhanced AI and NLP Capabilities**
  - Incorporating more advanced models for better context understanding and predictive insights. 
  - Providing users with deeper insights into their interactions and behaviors to promote personal growth.

- **Community and Collaboration Features**
  - Allowing users to share and collaborate on knowledge graphs within trusted networks.

- **Voice Interface Integration**
  - Enabling voice commands for a more natural and hands-free user experience. With the audio bytes data webhook - we aim to train private AI voice clones of the user and let the users talk with themselves over this second brain - sounds creepy but  this is the feature we're actively working on and we're super excited about it. 

---

Omiverse represents a fusion of innovative technologies aimed at revolutionizing personal knowledge management. Through this project, we not only pushed the boundaries of what's possible with AI wearables but also laid the groundwork for future developments that could significantly enhance how we interact with our own data.
