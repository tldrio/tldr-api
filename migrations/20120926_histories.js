/*
 * This migration was necessary once we defined the new required field "history" on Tldr and User
 * It adds a new history to all Tldrs and Users that currently don't have one
 * Date: 26/09/2012
 *
 */

var async = require('async')
