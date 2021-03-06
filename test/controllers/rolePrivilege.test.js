'use strict';

var app = require('../../src/app');
var request = require('supertest');
var User = require('../../src/logicals/user');
var Role = require('../../src/logicals/role');
var RolePrivilege = require('../../src/logicals/rolePrivilege');
var Promise = require('bluebird');
var knex = require('../../src/lib/knex');
var tokenGenerator = require('../../src/controllers/tokenGenerator');

describe('user_role controller', function(){
    var userIds = null;
    var roleId = null;
    var rolePrivilegeIds = null;
    var token = null;

    before(function (done) {
        Promise.all([
            User.save({
                email: 'abc@abc.com'
            }),
            User.save({
                email: 'ab@ab.com'
            })
        ]).then(function (ids) {
            userIds = ids;
            return User.get(ids[0]);
        }).then(function (user) {
            token = tokenGenerator.generate(user);
            return Role.save({
                name: 'admin',
                scope: 2
            });
        }).then(function (id) {
            roleId = id;
            return Promise.all([
                RolePrivilege.save({
                    resource: 'PROJECT',
                    operation: 'GET',
                    role_id: roleId
                }),
                RolePrivilege.save({
                    resource: 'PROJECT',
                    operation: 'POST',
                    role_id: roleId
                })
            ]);
        }).then(function (ids){
            rolePrivilegeIds = ids;
            done();
        }).catch(done);
    });

    after(function (done) {
        Promise.all([
            knex('users').del(),
            knex('roles').del(),
            knex('role_privileges').del()
        ]).then(function () {
            done();
        }).catch(done);
    });

    describe('GET /api/role_privileges', function(){
        it('should return role_privilege list', function(done){
            request(app)
                .get('/api/role_privileges' + '?role_id=' + roleId + '&token=' + token)
                .expect('content-type', /json/)
                .expect(200)
                .expect(function(res){
                    if(res.body.length !== 2){
                        throw new Error('ret length invalid');
                    }
                })
                .end(done);
        });
    });

    describe('POST /api/role_privileges', function(){
        it('should create a role_privilege', function(done){
            request(app)
                .post('/api/role_privileges' + '?token=' + token)
                .send({
                    resource : 'PROJECT',
                    operation: 'PUT',
                    role_id: roleId
                })
                .expect('content-type', /json/)
                .expect(200)
                .end(done);
        });
    });

    describe('DELETE /api/role_privileges/:role_id', function (){
        it('should delete all role_privileges of the role', function (done){
            request(app)
                .delete('/api/role_privileges/' + roleId + '?token=' + token)
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }

                    request(app)
                        .get('/api/role_privileges' + '?role_id=' + roleId + '&token=' + token)
                        .expect('content-type', /json/)
                        .expect(function (res){
                            if(res.body.length !== 0){
                                throw new Error('ret length invalid');
                            }
                        })
                        .end(done);
                });
        });
    });
});