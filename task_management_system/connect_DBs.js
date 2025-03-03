const mysql = require('mysql2')
const {MongoClient} = require('mongodb')
    const mysqlDB = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'bobo232324',
        database: 'task_management_system'
    }
    )
    mysqlDB.connect((err)=> {
        if(err){
            console.log(err)
            process.exit(1)
        }
        else{
            console.log('MYSQL database is connected')
        }
    })
    const nosqlDB = async()=> {
        try{
            const nosqlClient = await MongoClient.connect('mongodb://localhost:27017/taskMangement')
            const nosqlConnection = nosqlClient.db('task_management_db')
            console.log('connected to the MongoDB successfully')
            return nosqlConnection
        }catch(err){
            console.log(`could not connect to the MongoDB database: ${err}`)
            process.exit(1)
        }
    }
    module.exports = {
        mysqlDB,
        nosqlDB
    }