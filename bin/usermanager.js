/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

if (typeof define !== "function") {
    var requirejs = require("requirejs");

    requirejs.config({
        nodeRequire: require,
        baseUrl: __dirname + "/.."
    });

    requirejs([ "util/common", "util/assert", "core/tasync" ], function (COMMON, ASSERT, TASYNC) {
        "use strict";

        TASYNC.trycatch(main, function (error) {
            console.log(error.trace || error.stack);

            COMMON.setProgress(null);
            COMMON.closeProject();
            COMMON.closeDatabase();
        });
        var _startHash = null,
            _branch = null,
            _projectName = null;

        function main () {
            //var args = COMMON.getParameters(null);
            //console.log(args);

            if (COMMON.getParameters("help") !== null) {
                console.log("Usage: node usermanager.js [options]");
                console.log("");
                console.log("Parses a GME xme file and stores it int a WEBGME database. Possible options:");
                console.log("");
                console.log("  -mongo [database [host [port]]]\topens a mongo database");
                console.log("  -proj <project>\t\t\tselects the given project");
                console.log("  -branch <branch>\t\t\tthe branch to work with");
                console.log("  -adduser <username> <publickey> <write = true/false> [password email]\t\t\tthe user to add");
                console.log("  -addproject <username> <projectname> <mode = r|rw|rwd>\t\t\t adds a project to the user data");
                console.log("  -removeproject <username> <projectname>\t\t\t removes a project from the user data");
                console.log("  -removeuser <username>\t\t\t removes a user data");
                console.log("  -info\t\t\t prints out the users and their data from the project");
                console.log("  -help\t\t\t\t\tprints out this help message");
                console.log("");
                return;
            }


            _branch = COMMON.getParameters("branch");
            if (_branch) {
                _branch = _branch[0] || "master";
            } else {
                _branch = "master";
            }
            _projectName = COMMON.getParameters("proj");
            if(_projectName){
                _projectName = _projectName[0];
            } else {
                _projectName = "users";
            }

            var done = TASYNC.call(COMMON.openDatabase);
            done = TASYNC.call(COMMON.openProject, done);
            var core = TASYNC.call(COMMON.getCore, done);
            _startHash = TASYNC.call(getRootHashOfBranch,_branch,done);


            if(COMMON.getParameters("info")){
                //info command
                done = TASYNC.call(infoPrint,core,_startHash);
            } else if(COMMON.getParameters("addproject")){
                var projpars = COMMON.getParameters("addproject");
                done = TASYNC.call(addProject,core,_startHash,projpars[0],projpars[1],projpars[2]);
            } else if(COMMON.getParameters("removeproject")){
                var projpars = COMMON.getParameters("removeproject");
                done = TASYNC.call(removeProject,core,_startHash,projpars[0],projpars[1]);
            } else if(COMMON.getParameters("adduser")){
                var projpars = COMMON.getParameters("adduser");
                done = TASYNC.call(addUser,core,_startHash,projpars[0],projpars[1],projpars[2],projpars[3] || null,projpars[4] || null);
            } else if(COMMON.getParameters("removeuser")){
                var projpars = COMMON.getParameters("removeuser");
                done = TASYNC.call(removeUser,core,_startHash,projpars[0],projpars[1]);
            }

            done = TASYNC.call(COMMON.closeProject, done);
            done = TASYNC.call(COMMON.closeDatabase, done);
            return done;
        }

        function getRootHashOfBranch (branch){
            var project = COMMON.getProject();
            var commitHash = project.getBranchHash(branch,null);
            var done = TASYNC.call(project.loadObject,commitHash);
            done = TASYNC.call(function(object){
                _branch = branch;
                return object.root;
            },done);
            return done;
        }

        function getCommitHashOfBranch (branch){
            var project = COMMON.getProject();
            return project.getBranchHash(branch,null);
        }

        function makeCommit (newroothash, parentcommithash, msg) {
            var project = COMMON.getProject();
            return project.makeCommit([parentcommithash], newroothash, msg);
        }

        function writeBranch (oldhash,newhash) {
            var project = COMMON.getProject();
            var done = project.setBranchHash(_branch, oldhash, newhash);
            return TASYNC.call(function () {
                console.log("Commit " + newhash + " written to branch " + _branch);
            }, done);
        }

        function persist (core,root) {
            console.log("Waiting for objects to be saved ...");
            var done = core.persist(root);
            var hash = core.getHash(root);
            return TASYNC.join(hash, done);
        }

        function saveModifications(newroothash,msg){
            var oldcommithash = getCommitHashOfBranch(_branch);
            var newcommit = TASYNC.call(makeCommit,newroothash,oldcommithash,msg);
            return TASYNC.call(writeBranch,oldcommithash,newcommit);

        }

        //commands
        function infoPrint(core,roothash){
            function printUser(userObject){
                var outstring = "";
                outstring+="username: "+core.getAttribute(userObject,'name')+"  \t| ";
                var userProjects = core.getRegistry(userObject,'projects');
                var hasproject=false;
                for(var i in userProjects){
                    if(hasproject === false){
                        hasproject = true;
                        outstring+= "projects:";
                    }
                    outstring+= " "+i;
                }

                outstring += " \t| can create: "+ (core.getRegistry(userObject,'create') === true ? "true" : "false");

                return outstring;
            }

            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    for(var i=0;i<objectArray.length;i++){
                        console.log(printUser(objectArray[i]));
                    }
                    return;
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;

        }
        function addProject(core,roothash,username,projectname,rights){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === username){
                            child = objectArray[i];
                        }
                        i++;
                    }

                    if(child){
                        var projects = core.getRegistry(child,'projects');
                        if(projects === null || projects === undefined){
                            projects = {};
                        } else {
                            projects = JSON.parse(JSON.stringify(projects));
                        }

                        if(projects[projectname] === null || projects[projectname] === undefined){
                            projects[projectname] = {};
                        }

                        if(rights.indexOf('r') !== -1){
                            projects[projectname].read = true;
                        } else {
                            projects[projectname].read = false;
                        }
                        if(rights.indexOf('w') !== -1){
                            projects[projectname].write = true;
                        } else {
                            projects[projectname].write = false;
                        }
                        if(rights.indexOf('d') !== -1){
                            projects[projectname].delete = true;
                        } else {
                            projects[projectname].delete = false;
                        }

                        core.setRegistry(child,'projects',projects);
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"project "+projectname+" has been added to user "+username);
                    } else {
                        return null;
                    }
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        }
        function removeProject(core,roothash,username,projectname){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === username){
                            child = objectArray[i];
                        }
                        i++;
                    }

                    if(child){
                        var projects = core.getRegistry(child,'projects');
                        if(projects === null || projects === undefined){
                            projects = {};
                        } else {
                            projects = JSON.parse(JSON.stringify(projects));
                        }
                        if(projects[projectname]){
                            delete projects[projectname];
                            core.setRegistry(child,'projects',projects);
                            var newroothash = persist(core,parentObject);
                            return TASYNC.call(saveModifications,newroothash,"project "+projectname+" has been removed from user "+username);
                        } else {
                            return null;
                        }
                    } else {
                        return null;
                    }
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        }
        function addUser(core,roothash,username,puk,cancreate,password,email){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === username){
                            child=objectArray[i];
                        }
                        i++;
                    }

                    if(child === null){
                        child = core.createNode(parentObject);
                        core.setAttribute(child,'name',username);
                        core.setRegistry(child,'create',cancreate === 'true');
                        core.setRegistry(child,'projects',{});
                        var key = require('fs').readFileSync(puk,'utf8');
                        core.setRegistry(child,'puk',key);
                        if(password){
                            core.setRegistry(child,'pass',password);
                        }
                        if(email){
                            core.setRegistry(child,'email',email);
                        }
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"a new user"+username+" has been added to the database");
                    } else {
                        core.setRegistry(child,'create',cancreate === true);
                        var key = require('fs').readFileSync(puk,'utf8');
                        core.setRegistry(child,'puk',key);
                        if(password){
                            core.setRegistry(child,'pass',password);
                        }
                        if(email){
                            core.setRegistry(child,'email',email);
                        }
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"the basic data of user "+username+" has been changed");
                    }
                    return null;
                },children);
            }

            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        }
        function removeUser(core,roothash,username){
            function iterateChildren(parentObject){
                var children = core.loadChildren(parentObject);
                return TASYNC.call(function(objectArray){
                    var i= 0,child=null;
                    while(i<objectArray.length && child === null){
                        if(core.getAttribute(objectArray[i],'name') === username){
                            child=objectArray[i];
                        }
                        i++;
                    }

                    if(child){
                        core.deleteNode(child);
                        var newroothash = persist(core,parentObject);
                        return TASYNC.call(saveModifications,newroothash,"user "+username+" has been removed from database");
                    }
                    return null;
                },children);
            }



            var root = core.loadRoot(roothash);
            var done = TASYNC.call(iterateChildren,root);

            return done;
        };
    });
};
