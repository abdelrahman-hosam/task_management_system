const express = require('express')
const app = express()
const db = require('../connect_DBs')
const validator = require('validator')
const bcrypt = require('bcrypt')

const headManagerLogin = async(id, password, res) => {
    try{
        const [headManager] = await db.mysqlDB.promise().query('SELECT password FROM head_manager WHERE id = ?', [id])
        if(!headManager[0])return res.status(404).json({'message':'a head manager with this id is not found'})
        const accountPassword = headManager[0].password
        if(accountPassword === '123456') if(password !== '123456')return res.status(400).json({'message':'password and id combination is wrong'})
        else{
            res.cookie('id', id, {httpOnly: true, secure: true})
            return res.status(200).json({'message':'user successfully logged in'})
        }
        const validPass = bcrypt.compareSync(accountPassword, password)
        if(!validPass) return res.status(400).json({'message':'password and id combination is wrong'})
        res.cookie('id', id, {httpOnly: true, secure: true})
        return res.status(200).json({'message':'user has successfully logged in'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const teamLeaderLogin = async(id, password, res) => {
    try{
        const [teamLeader] = await db.mysqlDB.promise().query('SELECT team_id, password FROM team_leader WHERE id = ?', [id])
        if(!teamLeader[0]) return res.status(404).json({'message':'a team leader with this id does not exist'})
        const accountPassword = teamLeader[0].password
        const teamId = teamLeader[0].teamId
        if(!teamId) return res.status(400).json({'message':'team leader does not have any team assigned to him'})
        if(accountPassword === '123456') if(password !== '123456')return res.status(400).json({'message':'password and id combination is wrong'})
            else{
                res.cookie('id', id, {httpOnly: true, secure: true})
                res.cookie('teamId', teamId, {httpOnly: true, secure: true})
                return res.status(200).json({'message':'user successfully logged in'})
            }
        const validPass = bcrypt.compareSync(accountPassword, password)
        if(!validPass) return res.status(400).json({'message':'password and id combination is wrong'})  
        res.cookie('id', id, {httpOnly: true, secure: true})
        res.cookie('teamId', teamId, {httpOnly: true, secure: true})
        return res.status(200).json({'message':'user successfully logged in'})     
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    } 
}

const teamMemberLogin = async(id, password, res) =>{
    try{
        const [teamMember] = await db.mysqlDB.promise().query('SELECT password FROM team_member WHERE id = ?', [id])
        if(!teamMember[0]) return res.status(404).json({'message':'a team leader with this id does not exist'})
        const accountPassword = teamMember[0].password
        if(accountPassword === '123456')if(password !== '123456') return res.status(400).json({'message':'id and password combination are wrong'})
        else{
            const tasks = await db.nosqlDB.collection('task').find({$in: [id, "$assignedTo"]}).toArray()
            res.cookie('id', id, {httpOnly: true, secure: true})
            res.cookie('tasks', tasks, {httpOnly: true, secure: true})
            return res.status(200).json({'message':'user has successfully logged in'})
        }
        const tasks = await db.nosqlDB.collection('task').find({$in: [id, "$assignedTo"]}).toArray()
        const validPass = bcrypt.compareSync(accountPassword, password)
        if(!validPass)return res.status(400).json({'message':'id and password combination is incorrect'})
        res.cookie('id', id, {httpOnly: true, secure: true})
        res.cookie('tasks', tasks, {httpOnly: true, secure: true})
        return res.status(200).json({'message':'user has successfully logged in'})    
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const adminLogin = async(id, password,res) => {
    try{
        const [admin] = await db.mysqlDB.promise().query('SELECT password FROM task_admin WHERE id = ?' , [id])
        if(!admin[0]) return res.status(404).json({'message':'there is no admin with this id'})
        const accountPassword = admin[0].password
        if(accountPassword === '123456')if(password !== '123456') return res.status(400).json({'message':'id and password combination are wrong'})
        else{
            res.cookie('id', id)
            return res.status(200).json({'message':'user has successfully logged in'})
        }
        const validPass = bcrypt.compareSync(accountPassword, password)
        if(!validPass) return res.status(400).json({'message':'id and password combination are wrong'})
        res.cookie('id',id, {httpOnly: true, secure: true})
        return res.status(200).json({'message':'user has successfully logged in'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const changePassHandler = async(id, user, oldPass, newPass, res) => {
    try{
        const mysql = db.mysqlDB
        const [oldPasswordQuery] = await mysql.promise().query('SELECT password FROM ?? WHERE id = ?', [user, id])
        if(!oldPasswordQuery[0]) return res.status(404).json({'message':'id for this role is not found'})
        const oldPassword = oldPasswordQuery[0].password
        if(oldPassword === '123456')if(oldPass !== '123456') return res.status(400).json({'message':'id and password combination are wrong'})
            else{
                const [update]= await mysql.promise().query('UPDATE ?? SET password = ? WHERE id = ?' , [user, newPass, id])
                if(update[0].rowsAffected < 1) return res.status(500).json({'message':'we could not update the password'})
                return res.status(200).json({'message':'password was updated succesfully'})
            }
        const validPass = bcrypt.compareSync(oldPassword, oldPass)
        if(!validPass) return res.status(400).json({'message':'id and password combination are wrong'})
        const [update]= await mysql.promise().query('UPDATE ?? SET password = ? WHERE id = ?' , [user, newPass, id])
        if(update[0].affectedRows < 1) return res.status(500).json({'message':'we could not update the password'})
        return res.status(200).json({'message':'password was updated succesfully'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const logout = async(req,res) => {
    try{
        const id = req.cookies.id
        if(!id) return res.status(400).json({'message':'user is not logged in'})
        for(let cookie in req.cookies) res.clearCookie(cookie)
        return res.status(200).json({'message':'you have logged out succesfully'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const login= async(req,res) => {
    try{
        const {id,password} = req.body
        if(!id || !password) return res.status(400).json({'message':'insert the required data'})
        if(id[0] === '0') return adminLogin(id,password,res)
        else if(id[0] === '1') return headManagerLogin(id,password,res)
        else if(id[0] === '2') return teamLeaderLogin(id, password, res)
        else if(id[0] === '3') return teamMemberLogin(id, password, res)
        else return res.status(400).json({'message':'This id is not valid'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const changePass = async(req,res) => {
    try{
        const {oldPassword, newPassword} = req.body
        const {id} = req.cookies
        if(!id) return res.status(401).json({'message':'you are not authorized to do this action'})
        if(!oldPassword || !newPassword) return res.status(400).json({'message':'insert the required data'})
        if(id[0] === '0') return changePassHandler(id, 'admin', oldPassword, newPassword, res)
        else if(id[0] === '1') return changePassHandler(id, 'head_manager', oldPassword, newPassword, res)
        else if(id[0] === '2') return changePassHandler(id, 'team_leader', oldPassword, newPassword, res)
        else if(id[0] === '3') return changePassHandler(id, 'team_member', oldPassword, newPassword, res)
        else return res.status(400).json({'message':'This id is not valid'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

module.exports = {login , logout, changePass}