const db = require('../connect_DBs')
const validator = require('validator')
const mongoose = require('mongoose')

const validTypes = (type , fields) => fields.every(field=> typeof field === type)

const customId = async(type) => {
    let customId
    const secondDigit = now.getFullYear().toString().slice(-2)
    const thirdDigit = String(now.getMonth()+1).padStart(2,'0')
    const fourthDigit = String(now.getDay()).padStart(2,'0')
    if(String(type).toLowerCase() === 'head manager'){
        customId += '1' + secondDigit + thirdDigit + fourthDigit
        const [count] = await db.mysqlDB.promise().query(`SELECT COUNT(id) AS total FROM head_manager WHERE id LIKE '${customId}%'`)
        customId += String(count[0].total + 1)
        return customId
    }
    else if(String(type).toLowerCase() === 'team leader'){
        customId += '2' + secondDigit + thirdDigit + fourthDigit
        const [count] = await db.mysqlDB.promise().query(`SELECT COUNT(id) AS total FROM team_leader WHERE id LIKE '${customId}%'`)
        customId += String(count[0].total + 1)
        return customId
    }
    else if(String(type).toLowerCase() === 'team member'){
        customId += '3' + secondDigit + thirdDigit + fourthDigit
        const [count] = await db.mysqlDB.promise().query(`SELECT COUNT(id) AS total FROM team_member WHERE id LIKE '${customId}%'`)
        customId += String(count[0].total + 1)
        return customId
    }
    else if(String(type).toLowerCase() === 'admin'){
        customId += '0' + secondDigit + thirdDigit + fourthDigit
        const [count] = await db.mysqlDB.promise().query(`SELECT COUNT(id) AS total FROM team_member WHERE id LIKE '${customId}%'`)
        customId += String(count[0].total + 1)
        return customId
    }
        
    else{
        return customId
    }
}

const createHeadManager = async(req , res)=> {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const {name, dob , email} = req.body
        if(!name || !dob || !email) return res.status(400).json({'message':'insert all the required info'})
        const areValid = validTypes('string' , [name, dob, email])
        if(!areValid) return res.status(400).json({'message':'insert the valid datatypes for the fields'})
        if(!validator.isEmail(email)) return res.status(400).json({'message':'insert the email in a valid form'})
        const id = await customId('head manager')
        if(!id)return res.status(500).json({'message':'id could not be created'})
        await db.mysqlDB.promise().query('INSERT INTO head_manager(id, employee_name, birthdate, email) VALUES (?,?,?,?)' , [id, name, dob, email])
        return res.status(201).json({'message': 'head manager was created successfully'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong: ${err}`})
    }
}

const createTeam = async(req , res)=> {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const {head_manager , team_leader} = req.body
        if(!head_manager || !team_leader) return res.status(400).json({'message':'insert all the required data'})
        const areValid = validTypes('string' , [head_manager, team_leader])
        if(!areValid) return res.status(400).json({'message':'insert the fields in their required datatypes'})
        const [{insertId}] = await db.mysqlDB.promise().query('INSERT INTO team(head_manager, team_leader) VALUES (?,?)' , [head_manager, team_leader])
        await db.nosqlDB.collection('team').insertOne({id: insertId})
        return res.status(201).json({'message':'team is successfully created'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const createTeamLeader = async(req, res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const {name, birthdate, email} = req.body
        if(!name || !birthdate || !email) return res.status(400).json({'message': 'insert all the required data'})
        const areValid = validTypes('string', [name, birthdate, email])
        if(!areValid) return res.status(400).json({'message':'insert the fields in the required datatypes'})
        if(!validator.isEmail(email))return res.status(400).json({'message':'insert the email in the valid form'})
        const id = await customId('team leader')
        if(!id) return res.status(500).json({'message':'id could not be created'})
        await db.mysqlDB.promise().query('INSERT INTO team_leader(id, employee_name, birthdate, email) VALUES (?,?,?,?)', [id, name, birthdate, email])
        return res.status(201).json({'message':`team leader ${name} was successfully created`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const createTeamMember = async(req, res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const {name, birthdate, email, team_id} = req.body
        if(!name || !birthdate || !email || !team_id)return res.status(400).json({'message':'insert all the required data'})
        const areValid = validTypes('string', [name, birthdate, email, team_id])
        if(!areValid) return res.status(400).json({'message':'insert the fields in the required form'})
        const mysql = db.mysqlDB
        const [team] = await mysql.promise.query('SELECT * FROM team WHERE id= ?' , [team_id])
        if(!team[0]) return res.status(404).json({'message':'No team exists with this id'})
        const [{insertId}] = await mysql.promise().query('INSERT INTO team(employee_name, birthdate, email, team_id) VALUES(?,?,?,?)', [name, birthdate, email, team_id])
        await db.nosqlDB.collection('team').updateOne({id: team_id}, {$push: {teamMembers: insertId}})
        return res.status(201).json({'message':`A team is created with id ${insertId}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const getHeadManager = async(req , res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const id = req.body.id
        if(!id) return res.status(400).json({'message':'insert all the required data'})
        const areValid = validTypes('string' , [id])
        if(!areValid) return res.status(400).json({'message':'insert the fields in their required datatyped'})
        const [head_manager] = await db.mysqlDB.promise().query('SELECT * FROM head_manager WHERE id = ?' , [id])
        if(!head_manager[0]) return res.status(404).json({'message':'head manager with this ID was not found'})
        return res.status(200).json({'message':`head manager was retrived ${head_manager}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong: ${err}`})
    }
}

const addAdmin = async(req,res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const name = req.body.name
        if(!name) return res.status(400).json({'message':'insert all the required data'})
        const areValid = validTypes('string', [name])
        if(!areValid) return res.status(400).json({'message':'insert the fields in the required form'})
        const id = customId('admin')
        if(!id) return res.status(500).json({'message':'we could not generate the id'})
        await db.mysqlDB.promise().query('INSERT INTO task_admin(id, name) VALUES(?,?)' , [id, name])
        return res.status(201).json({'message':'admin is created successfully'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const removeAdmin = async(req,res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const id = req.body.id
        if(!id) return res.status(400).json({'message':'insert all the required data'})
        const areValid = validTypes('string', [id])
        if(!areValid) return res.status(400).json({'message':'insert the data in the required form'})
        const [deleted] = await db.mysqlDB.promise().query('DELETE FROM task_admin WHERE id = ?' , [id])
        if(deleted.affectedRows < 1) return res.status(404).json({'message':'Admin does not exist'})
        return res.status(200).json({'meesage':`Admin with the id ${id} is removed successfully`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const removeTeam = async(req,res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const id = req.body.id
        if(!id) return res.status(400).json({'message':'insert all the required data'})
        const areValid = validTypes('string', [id])
        if(!areValid) return res.status(400).json({'message':'insert the fields in the required form'})
        const deleted = await db.mysqlDB.promise().query('DELETE FROM team WHERE id = ?' , [id])
        if(deleted.affectedRows < 1) return res.status(404).json({'message':'team does not exist'})
        return res.status(200).json({'message':`Team with id ${id} is deleted`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const removeTeamLeader = async(req,res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const id = req.body.id
        if(!id) return res.status(400).json({'message':'insert all the required data'})
        const areValid = validTypes('string', [id])
        if(!areValid) return res.status(400).json({'message':'insert the fields in the required form'})
        const deleted = await db.mysqlDB.promise().query('DELETE FROM team_leader WHERE id = ?' , [id])
        if(deleted.affectedRows < 1) return res.status(404).json({'message':'team does not exist'})
        return res.status(200).json({'message':`Team with id ${id} is deleted`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const removeTeamMember = async(req,res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const id = req.body.id
        if(!id)return res.status(400).json({'message':'insert all the required fields'})
        const areValid = validTypes('string' , [id])
        if(!areValid)return res.status(400).json({'message':'insert the fields in the required form'})
        const [deletedSQL] = await db.mysqlDB.promise().query('DELETE FROM team_memeber WHERE id = ?' , [id])
        if(deletedSQL.affectedRows < 1)return res.status(404).json({'message':`team member with the id ${id} maybe does not exist`})
        const deletedNOSQL = await db.nosqlDB.collection('team').deleteOne({id})
        if(deletedNOSQL.deletedCount < 1) return res.status(404).json({'message':`team member with the id ${id} maybe does not exist`})
        return res.status(200).json({'message':`team member with the id ${id} is successfully deleted from the database`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const showFromDB = async(req , res) => {
    try{
        const adminId = req.cookies.id
        if(!adminId || adminId[0] !== '0')return res.status(401).json({'message':'this user does not have access to do this action'})
        const tableName = req.body.tableName
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ message: "Invalid table name" });
        }
        const [data] = await db.mysqlDB.promise().query(`SELECT * FROM ??` , [tableName])
        if(!data) return res.status(404).json({'message':'data requested was not found'})
        return res.status(200).json({'message':`data requested ${data}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}