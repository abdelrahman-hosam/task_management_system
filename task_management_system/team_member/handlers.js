const express = require('express')
const app = express()
const db = require('../connect_DBs')
const validator = require('validator')
const mongoose = require('mongoose')
const validTypes = (type , fields) => fields.every(field=> typeof field === type)

const viewAssignedTasks = async(req,res) => {
    try{
        const id = req.cookies.id
        if(!id || id[0] !== '3') return res.status(401).json({'message':'User is not authorized to do this action'})
        const tasks = db.nosqlDB.collection('task').find({assignedTo: {$in: [id]}}, {projection:{_id: 0, teamId: 0, managerId: 0}}).toArray()
        if(!tasks[0]) return res.status(404).json({'message':'no tasks are assigned to this user'})
        return res.status(200).json({'message':`tasks assigned to you are ${tasks}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const updateProgress = async(req,res) => {
    try{
        const id = req.cookies.id
        const {progress, taskId} = req.body
        if(!id || id[0] !== '3') return res.status(401).json({'message':'User is not authorized to do this action'})
        if(!taskId || !progress || progress > 100) return res.status(400).json({'message':'Insert all the required data or double check the progress'})
        const newProgress = await db.nosqlDB.collection('task').updateOne({id: taskId}, [{$set:
                                                                                            {progress:
                                                                                                {$cond:{
                                                                                                    if: {$in: [id, "$assignedTo"]},
                                                                                                    then: progress,
                                                                                                    else: "$progress"
                                                                                                }
                                                                                                }}}])
        if(newProgress.modifiedCount < 1) return res.status(404).json({'message':'Task with this Id is not found or you are not assigned to this task'})
        return res.status(200).json({'message':`task with the id ${taskId} progress updated to ${progress}`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const addComent = async(req,res) => {
    try{
        const {id, tasks} = req.cookies
        const {content,taskId} = req.body
        if(!id || id[0] !== '3') return res.status(401).json({'message':'User not authorized to do this action'})
        if(!tasks)return res.status(404).json({'message':'No tasks are assigned to you'})
        if(!content || !taskId) return res.status(400).json({'message':'Insert all the required data'})
        const areValid = validTypes('string', [content, taskId])
        if(!areValid) return res.status(400).json({'message':'Insert the fields in their required datatypes'})
        if(!tasks.includes(taskId))return res.status(401).json({'message':'You are not authorized to add comment to this task'})
        const nosql = db.nosqlDB
        let commentId
        const commentCount = await nosql.collection('task').aggregate([{$match: {id: taskId}},{$project: {_id: 0, count: {$size: '$comments'}}}]).toArray()
        if(commentCount.length === 0 || commentCount[0].count === 0) commentId = 1
        else commentId = parseInt(commentCount[0].count) + 1
        const comment = {id: String(commentId), publisher: id, content: content}
        const insertComment = await nosql.collection('task').updateOne({id: taskId}, {$push: {comments: comment}})
        if(insertComment.modifiedCount < 1) return res.status(500).json({'message':'something went wrong we could not add the comment'})
        return res.status(201).json({'message':'comment was created successfully'})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

const removeComment = async(req,res) => {
    try{
        const {id, tasks} = req.cookies
        const {commentId, taskId} = req.body
        if(!id || id[0] !== '3')return res.status(401).json({'message':'User does not have access to do this action'})
        if(!tasks) return res.status(404).json({'message':'user does not have any tasks assigned to'})
        if(!commentId || taskId)return res.status(400).json({'message':'insert all the required data'})
        const areValid = validTypes('string', [commentId])
        if(!areValid) return res.status(400).json({'message':'insert the data in the required form'})
        if(!tasks.includes(taskId)) return res.status(401).json({'message':'user does not have access to this task'})
        const nosql = db.nosqlDB
        const deletedComment = await nosql.collection('task').updateOne({id: taskId} , {$pull: {comments: {publisher: id, id: commentId}}})
        if(!deletedComment.modifiedCount < 1) return res.status(404).json({'message':'A comment with the given id is not found or the user does not have premission to delete this comment'})
        return res.status(200).json({'message':`comment with id ${commentId} was deleted`})
    }catch(err){
        return res.status(500).json({'message':`something went wrong ${err}`})
    }
}

module.exports = {
    viewAssignedTasks,
    updateProgress,
    addComent,
    removeComment
}