'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const{BlogPosts} = require('../modles');
const{app, runServer,closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHTTP);

function tearDownDB(){
    return new Promise((resolve, reject) =>{
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
            .then(result => resolve(result))
            .catch(err => reject(err));
    });
}

function seedBlogPostsData(){
    console.info('seeding blog data');
    const seedData = [];
    for (let i=0; i <= 10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            },
            title: faker.lorem.sentence(),
            content:faker.lorem.text(),    
        });
    }
    return BlogPosts.inserMany(seedData);
}

describe('blog post API resource', function (){
    before(function(){
        return runServer(TEST_DATABASE_URL);
    });
    beforeEach(function(){
        return seedBlogPostsData();
    })
    afterEach(function(){
        return tearDownDB();
    })
    after(function(){
        return closeServer();
    });
//get

    describe('should return all existing posts',function (){
        let res;
        return chai.request(app)
        .get('/posts')
        .then(function(_res) {
            res = _res;
            expect(res).to.have.status(200);
            expect(res.body.BlogPosts).to.have.length.of.at.least(1);
            return BlogPosts.count();
        })
        .then(function(count){
            expect(res.body.BlogPosts).to.have.length.of(count);
        });
    });
    //post

    describe('POST endpoint', function (){

        it('should add a new blog post', function () {
        const newPost = {
            title: faker.lorem.sentence(),
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            },
            content: faker.lorem.text(),
        };

        return chai.request(app)
            .post('/posts')
            .send(newPost)
            .then(function(res) {
            expect(res).to.have.status(201);
            expect(res).to.be.json;
            expect(res.body).to.be.a('object');
            expect(res.body).to.include.keys(
                'id', 'title','content', 'author','created');
            expect(res.body.title).to.equal(newPost.title);
            // cause Mongo should have created id on insertion
            expect(res.body.id).to.not.be.null;
            expect(res.body.author).to.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
            expect(res.body.content).to.equal(newPost.content);
            return BlogPosts.findById(res.body.id);
            })
            .then(function(post) {
            expect(post.title).to.equal(newPost.name);
            expect(post.author.firstName).to.equal(newPost.author.firstName);
            expect(post.author.lastName).to.equal(newPost.author.lastName);
            expect(post.content).to.equal(newPost.content);
            });
        });
    });

    describe('PUT endpoint',function (){
        it('should update fields', function (){
            const updateData = {
                title: 'nature',
                content: 'plants trees grass',
                author: {
                    firstName: 'fizz',
                    lastName: 'bar'
                }
            };
            
            return BlogPosts
                .findOne()
                .then(function(post) {
                updateData.id = post.id;
            
                // make request then inspect it to make sure it reflects
                // data we sent
                return chai.request(app)
                    .put(`/posts/${post.id}`)
                    .send(updateData);
                })
                .then(function(res) {
                expect(res).to.have.status(204);
            
                return BlogPosts.findById(updateData.id);
                })
                .then(function(post) {
                expect(post.title).to.equal(updateData.title);
                expect(post.content).to.equal(updateData.content);
                expect(post.author.firstName).to.equal(updateData.author.firstName);
                expect(post.author.lastName).to.equal(updateData.author.lastName);
                });
        });
    });

    describe('Delete endpoint',function(){
        it('should delete a post by id', function (){
            let post;

            return BlogPosts
            .findOne()
            .then(function(_post) {
                post = _post;
                return chai.request(app).delete(`/posts/${post.id}`);
            })
            .then(function(res) {
                expect(res).to.have.status(204);
                return BlogPosts.findById(post.id);
            })
            .then(function(_post) {
                expect(_post).to.be.null;
            });
        });
    });

});
