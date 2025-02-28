const express = require('express')
const app = express()
const db = require('../connect_DBs')
const validator = require('validator')
const mongoose = require('mongoose')
const validTypes = (type , fields) => fields.every(field=> typeof field === type)

const canAssign = async(teamId, taskId, teamLeaderId, [members])=>{
    const [teamLeader] = await db.mysqlDB.promise().query('SELECT team_leader_id FROM team WHERE id = ?' , [teamId])
    if(teamLeader[0].team_leader_id !== teamLeaderId) return false
    const teamMembersQuery = await db.nosqlDB.collection('team').findOne({id: teamId} , {projection: {teamMembers: 1, assignedTasks:1 , _id: 0}})
    const teamMembers = teamMembersQuery.teamMembers
    const assignedTasks = teamMembersQuery.assignedTasks
    if(!assignedTasks.include(taskId)) return false
    return members.every(element => validator.isIn(element, teamMembers))
}

const showAssignedTasks = async(req, res)=> {
    try{
        const id = req.cookies.id
        if(!id)return res.status(401).json({'message':'user does not have access to this functionality'})
        const [team_id] = await db.mysqlDB.promise().query('SELECT team_id FROM team_leader WHERE id = ?' , [id])
        if(!team_id[0])return res.status(404).json({'message':`team leader with the id ${id} does not have an assigned team`})
        const team = await db.nosqlDB.collection('team').findOne({id: team_id.team_id}, {projection: {assignedTasks: 1 , _id: -1}})
        if(!team) return res.status(404).json({'message':`team with the team id ${team_id.team_id} does not have tasks assigned to it`})
        return res.status(200).json({'message':`team with the team id ${team_id.team_id} has the tasks ${team.assignedTasks} assigned to them`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const assignToMembers = async(req,res) => {
    try{
        const {id, teamId} = req.cookies
        const {members, taskId} = req.body
        if(!id || id[0] !== '2' || !teamId) return res.status(401).json({'message':'User is not authorized to do this action'})
        if(!members, !taskId) return res.status(400).json({'message':'insert all the required data'})
        const areValidMemebers = validTypes('array', [members])
        const areValidId = validTypes('string', [taskId])
        if(!areValidId || !areValidMemebers) return res.status(400).json({'message':'Insert the data in the required form'})
        const nosql = db.nosqlDB
        const validAssign = canAssign(teamId, taskId, id, members)
        if(!validAssign) return res.status(401).json({'message':'Team leader does not have access to assign tasks to those team members'})
        const assignTo = await nosql.collection('task').updateOne({id: taskId} , {$push: {assignedTo: {$each: members}}})
        if(assignTo.modifiedCount < 1) return res.status(500).json({'message':'we could not update the task'})
        return res.status(200).json({'message':`task with id ${taskId} is assigned to memebers with id ${members} successfully`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const updateAssignedTo = async(req,res) => {
    try{
        const {id, teamId} = req.cookies
        const {newMembers, taskId} = req.body
        if(!id || id[0] !== '2' || !teamId) return res.status(401).json({'message':'User is not authorized to do this action'})
        if(!newMembers, !taskId) return res.status(400).json({'message':'insert all the required data'})
        const areValidMemebers = validTypes('array', [newMembers])
        const areValidId = validTypes('string', [taskId])
        if(!areValidId || !areValidMemebers) return res.status(400).json({'message':'Insert the data in the required form'})
        const nosql = db.nosqlDB
        const validAssign = canAssign(teamId, taskId, id, newMembers)
        if(!validAssign) return res.status(401).json({'message':'Team leader does not have access to assign tasks to those team members'})
        const assignTo = await nosql.collection('task').updateOne({id: taskId} , {$set: {assignedTo: {$each: newMembers}}})
        if(assignTo.modifiedCount < 1) return res.status(500).json({'message':'we could not update the task'})
        return res.status(200).json({'message':`task with id ${taskId} is assigned to memebers with id ${newMembers} successfully`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const trackProgress = async(req,res) => {
    try{
        const {id, teamId} = req.cookies
        const {newMembers, taskId} = req.body
        if(!id || id[0] !== '2' || !teamId) return res.status(401).json({'message':'User is not authorized to do this action'})
        if(!newMembers, !taskId) return res.status(400).json({'message':'insert all the required data'})
        const areValidMemebers = validTypes('array', [newMembers])
        const areValidId = validTypes('string', [taskId])
        if(!areValidId || !areValidMemebers) return res.status(400).json({'message':'Insert the data in the required form'})
        const nosql = db.nosqlDB
        const task = await nosql.collection('task').findOne({id: taskId} , {projection: {progress: 1, teamId: 1}})
        if(teamId !== task.teamId)return res.status(401).json({'message':'User is not authorized to track progress for this team'})
        return res.status(200).json({'message':`task with the id ${taskId} has the progress ${task.progress}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const viewCommentsForTask = async(req,res) => {
    try{
        const {id, teamId} = req.cookies
        const {taskId} = req.body
        if(!id || id[0] !== '2' || !teamId) return res.status(401).json({'message':'User is not authorized to do this action'})
        if(!newMembers, !taskId) return res.status(400).json({'message':'insert all the required data'})
        const areValidId = validTypes('string', taskId)
        if(!areValidId) return res.status(400).json({'message':'Insert the data in the required form'})
        const comments = await db.nosqlDB.collection('task').findOne({id: taskId} , {projection:{comments: 1, teamId: 1}})
        if (comments.teamId !== teamId) return res.status(401).json({'message':'you do not have access to this task'})
        return res.status(200).json({'message':`comments for the task ${taskId} are ${comments.comments}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}