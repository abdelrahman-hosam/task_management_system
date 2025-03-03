const express = require('express')
const app = express()
const db = require('../connect_DBs')
const validator = require('validator')
const mongoose = require('mongoose')

const validTypes = (type , fields) => fields.every(field=> typeof field === type)

const getHeadManagerTeams = async(req , res) => {
    try{
        const id = req.cookies.id
        if(!id || id[0] !== '1') return res.status(401).json({'message':'user does not have access to this functionality'})
        const areValid = validTypes('string',[id])
        if(!areValid) return res.status(400).json({'message':'insert the fields in their required datatypes'})
        const [teams] = await db.mysqlDB.promise().query('SELECT * FROM team WHERE head_manager_id = ?' , [id])
        if(!teams)return res.status(404).json({'message':'no teams are attached to this head manager or head manager with this id does not exist'})
        return res.status(200).json({'message':`teams attached to the head manager are: ${teams}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong: ${err}`})
    }
}

const assignTask = async(req , res) => {
    try{
        const {teamId, description, taskName, deadline, priorityLevel} = req.body
        const managerId = req.cookies.id
        //validation begin
        if(!managerId || managerId[0] !== '1') return res.status(401).json({'message':'user does not have access to this fuctionality'})
        if(!teamId || !description || !taskName || !deadline || !priorityLevel) return res.status(400).json({'message':'isnert all the required data'})
        const areValid = validTypes('string' , [managerId, teamId, description, taskName, deadline, priorityLevel])
        if(!areValid) return res.status(400).json({'message':'insert the fields in their required datatypes'})
        if(String(priorityLevel).toLowerCase() !== 'high' && String(priorityLevel).toLowerCase() !== 'low' && String(priorityLevel).toLowerCase() !== 'moderate') return res.status(400).json({'message':'only valid values for priority level is high, moderate and low'})
        //validation end
        const [team] = await db.mysqlDB.promise().query('SELECT * FROM team WHERE id = ? AND head_manager_id = ?' , [teamId,managerId])
        //create single connection to the nosql db 
        const nosql = db.nosqlDB
        if(!team[0])return res.status(404).json({'message':`The error could be one of the following: the manager is not found or the team is not found or the manager does not have a premission to assign tasks to this team`})
        //if no team leader assigned to the team
        if(!team[0].team_leader_id)return res.status(400).json({'message':'tasks can not be assigned to this team as it has no team leader'})
        const teamLeaderId = team[0].team_leader_id
        //create task id 
        let id
        const lastDoc = await nosql.collection('task').findOne({} , {_id: -1})
        if(!lastDoc) id = 1
        else id = int(lastDoc.id) + 1
        //insert the task into the task collection then attach the task to a assignedTasks field for a team
        await nosql.collection('task').insertOne({id, managerId, teamId, description, taskName, deadline, priorityLevel, progress: 0})
        await nosql.collection('team').updateOne({id: teamId} , {$push: {assignedTasks: id}})
        return res.status(200).json({'message':`task was created and assigned the team ${teamId} successfully`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const assignToNewTeam = async(req, res) => {
    try{
        const {oldTeamId, newTeamId, taskId} = req.body
        const managerId = req.cookies.id
        if(!managerId || managerId[0] !== '1') return res.status(401).json({'message':'user does not have access to this functionality'})
        if(!oldTeamId || !newTeamId || !taskId) return res.status(400).json({'message':'insert all the required info'})
        const areValid = validTypes('string', [oldTeamId, newTeamId, taskId, managerId])
        if(!areValid) return res.status(400).json({'message':'insert the fields in their required datatypes'})
        //create one connection only to the databases
        const sql = db.mysqlDB
        const nosql = db.nosqlDB
        const [oldTeam] = await sql.promise().query('SELECT * FROM team WHERE id = ?' , [oldTeamId])
        const [newTeam] = await sql.promise().query('SELECT * FROM team WHERE id = ?' , [newTeamId])
        if(!oldTeam || !newTeam) return res.status(404).json({'message':'One team or both does not exist'})
        if(oldTeam.head_manager_id !== managerId || newTeam.head_manager_id !== managerId)return res.status(401).json({'message':'manager does not have access on the 2 teams or they does not exist'})
        const transaction = await nosql.startSession()
        //removing the task from the first team to the second
        //transaction is used to ensure the task is both removed from a team and added to another otherwise it will rollback
        transaction.startTransaction()
        try{
            const deletedTask = await nosql.collection('team').updateOne({id: oldTeamId} , {$pull: {'assignedTasks': taskId}})
            if(deletedTask.modifiedCount < 1) return res.status(404).json({'message':'task is not found in this team'})
            const addNewTask = await nosql.collection('team').updateOne({id: newTeamId} , {$push: {assignedTasks: taskId}})
            if(addNewTask.modifiedCount < 1){
                await transaction.abortTransaction()
                return res.status(500).json({'message':'something went wrong'})
            }
            return res.status(200).json({'message':`task with the id ${taskId} was removed from ${oldTeamId} and added to ${newTeamId}`})
        }catch(err){
            await transaction.abortTransaction()
            transaction.endSession()
            return res.status(500).json({'message':`something went wrong ${err}`})
        }
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const getAssignedTasks = async(req,res) => {
    try{
        const id = req.cookies.id
        if(!id || id[0] !== '1') return res.status(401).json({'message':'User is not authorized to do this action'})
        const areValid = validTypes('string' , [id])
        if(!areValid) return res.status(400).json({'message':'insert the fields in their required types'})
        const [tasks] = await db.nosqlDB.collection('task').find({managerId: id} , {projection: {taskName: 1 , description: 1 , priority: 1 , teamId: 1}}).toArray()
        if(!tasks[0]) return res.status(404).json({'message':'there are no tasks assigned by you'})
        return res.status(200).json({'message':`tasks assigned by you are ${tasks}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const removeTask = async(req,res) => {
    try{
        const id = req.cookies.id
        const taskId = req.body.taskId
        if(!id || id[0] !== '1') return res.status(401).json({'message':'User is not authorized to do this action'})
        if(!taskId) return res.status(400).json({'message':'insert all the required fields'})
        const areValid = validTypes('string' , [id])
        if(!areValid) return res.status(400).json({'message':'insert the fields in their required types'})
        const nosql = db.nosqlDB
        const deletedTask = await nosql.collection('task').findOneAndDelete({id: taskId} , {projection: {teamId: 1}})
        if(!deletedTask.value)return res.status(404).json({'message':`task with the id ${taskId} is not found`})
        const teamId = deletedTask.value.teamId
        if(!teamId)return res.status(200).json({'message':'Task was successfully deleted and was not attached to a team'})
        const deleteFromTeam = await nosql.collection('team').updateOne({id: teamId} , {$pull: {assignedTasks: taskId}})
        if(deleteFromTeam.modifiedCount < 1)return res.status(404).json({'message':'task was not assigned to this team'})
        return res.status(200).json({'message':`Task with id ${taskId} was successfully deleted and removed from the team ${teamId}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const extendDeadline = async(req, res) => {
    try{
        const id = req.cookies.id
        const {monthsReq , daysReq, taskId} = req.body
        if(!id || id[0] !== '1') return res.status(401).json({'message':'User is not authorized to do this action'})
        if(!months || !days || !taskId) return res.status(400).json({'message':'insert all the required fields'})
        const areValid = validTypes('string', [taskId, monthsReq, daysReq])
        if(!areValid) return res.status(400).json({'message':'insert fields in the required datatypes'})
        const months = parseInt(monthsReq , 10)
        const days = parseInt(daysReq, 10)
        const nosql = db.nosqlDB
        const deadline = await nosql.collection('task').findOne({id: taskId} , {projection: {deadline: 1}})
        if(!deadline) return res.status(404).json({'message':`task with the id ${taskId} is not found`})
        let newDeadline = new Date(deadline.deadline)
        newDeadline.setMonth(newDeadline.getMonth() + months)
        newDeadline.setDate(newDeadline.getDate() + days)
        const setNewDeadline = await nosql.collection('task').updateOne({id: taskId} , {$set: {deadline: newDeadline}})
        if(setNewDeadline.modifiedCount < 1) return res.status(500).json({'message':'something went wrong database was not updated'})
        return res.status(200).json({'message':`database was updated succesfully and the new deadline is ${newDeadline}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const updateTask = async(req, res) => {
    try{
        const id = req.cookies.id
        const {newTaskName, newDescribtion, newPriority, taskId} = req.body
        if(!id || id[0] !== '1')return res.status(401).json({'message':'user is does not have access to do this action'})
        if((!newTaskName && !newDescribtion && !newPriority)|| !taskId)return res.status(400).json({'message':'insert at least one field you want to update'})
        const areValid = validTypes('string', [newTaskName, newDescribtion, newPriority].filter(val => val !== undefined))
        if(!areValid)return res.status(400).json({'message':'insert the fields in thier required datatypes'})
        if(newPriority.toLowerCase() !== 'high' && newPriority.toLowerCase() !== 'moderate' && newPriority.toLowerCase() !== 'low' && newPriority !== undefined) return res.status(400).json({'message':'isnert a valid value for the priority level (high, moderate, low)'})
        let updateData = {}
        if(newTaskName) updateData.taskName = newTaskName
        if(newDescribtion) updateData.description = newDescribtion
        if(newPriority) updateData.priority = newPriority
        const update = await db.nosqlDB.collection('tasks').updateOne({$and: [{id: taskId}, {managerId: {$eq: id}}]}, {$set: updateData})
        if(update.matchedCount < 1) return res.status(404).json({'message':`A task with the id ${taskId} that is assigned by the manager with the id ${id} is not found`})
        if(update.modifiedCount < 1) return res.status(500).json({'message': 'We could not update the task information'})
        return res.status(200).json({'message':`Task with the id ${taskId} was updated with the following information ${updateData}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

module.exports = {
    getHeadManagerTeams,
    getAssignedTasks,
    assignTask,
    updateTask,
    extendDeadline,
    removeTask,
    assignToNewTeam
}