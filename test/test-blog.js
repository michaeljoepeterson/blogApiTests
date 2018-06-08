const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

console.log("hello test");

function seedBlogData() {
  const seedData = [];
  console.log("creating data");
  for (let i=1; i<=10; i++) {
    seedData.push(generateBlogData());
  }
  // this will return a promise
  return BlogPost.insertMany(seedData);
}

function generateBlogData() {
  return {
  	author: {
  		firstName:faker.name.firstName(),
  		lastName:faker.name.lastName()
  	},
  	title: faker.company.companyName(),
  	content: faker.lorem.sentences(),
  	created: faker.date.past()
  };
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('blog Api setting up db',function(){
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });	
  describe('Get endpoint',function(){
  	it('should return all blog posts',function(){
  		//BlogPost.find().then(posts => console.log(posts));
  		let res;
  		return chai.request(app).get("/posts").then(function(_res){
  			res = _res;
  			expect(res).to.have.status(200);
  			expect(res.body.posts).to.have.lengthOf.at.least(1);
  			return BlogPost.count();
  		}).then(function(count){
  			expect(res.body.posts).to.have.lengthOf(count);
  		});
  	});

  	it('should return blog post with correct fields', function(){
  		let resBlogPost;
  		return chai.request(app).get('/posts')
  		.then(function(res){
  			expect(res).to.have.status(200);
          	expect(res).to.be.json;
          	expect(res.body.posts).to.be.a('array');
          	expect(res.body.posts).to.have.lengthOf.at.least(1);
          	res.body.posts.forEach(function(post){
          		expect(post).to.be.a('object');
          		expect(post).to.include.keys('id','title','author','content','created');
          	});
          	resBlogPost = res.body.posts[0];
          	//console.log(res.body.posts[0]);
          	//console.log(BlogPost.findById(resBlogPost.id));
          	return BlogPost.findById(resBlogPost.id);
  		})
  		.then(function(post){

  			//console.log(resBlogPost.author);
  			//console.log(post.author);
  			const fullName = post.author.firstName + " " + post.author.lastName;
  			//console.log(fullName === resBlogPost.author);
  			
  			expect(resBlogPost.id).to.equal(post.id);
  			expect(resBlogPost.title).to.equal(post.title);
  			
  			expect(resBlogPost.author).to.equal(fullName);
  			expect(resBlogPost.content).to.equal(post.content);
  			
  		});
  		
  	});
  });

  describe("post endpoint",function(){
  	it('Should add a new blog post', function(){
  		const newPost = generateBlogData();
  		return chai.request(app).post('/posts').send(newPost)
  		.then(function(res){
  		  	expect(res).to.have.status(201);
          	expect(res).to.be.json;
          	expect(res.body).to.be.a('object');
          	expect(res.body).to.include.keys('id','title','author','content','created');
          	const fullName = newPost.author.firstName + " " + newPost.author.lastName;
          	expect(res.body.author).to.equal(fullName);
          	expect(res.body.id).to.not.be.null;
          	expect(res.body.title).to.equal(newPost.title);
          	expect(res.body.content).to.equal(newPost.content);
          	return BlogPost.findById(res.body.id);
  		})
  		.then(function(post){
  			const fullName = post.author.firstName + " " + post.author.lastName;
  			const fullNamePost = newPost.author.firstName + " " + newPost.author.lastName;
  			expect(newPost.title).to.equal(post.title);
  			
  			expect(fullNamePost).to.equal(fullName);
  			expect(newPost.content).to.equal(post.content);
  		})
  	});
  });

  describe('Put endpoint',function(){
  	it('should update fields',function(){
  		const updateData = {
        title: 'fofofofofofofof',
        content: 'futuristic fusion'
      };
      return BlogPost.findOne()
      .then(function(post){
      	updateData.id = post.id;
      	return chai.request(app).put(`/posts/${post.id}`).send(updateData);
      })
      .then(function(res){
      	expect(res).to.have.status(204);

      	return BlogPost.findById(updateData.id);
      })
      .then(function(post){
      	expect(post.title).to.equal(updateData.title);
      	expect(post.content).to.equal(updateData.content);
      });
  	});
  });

  describe('delete endpoint', function(){
  		
  	it('should delete post by id',function(){

  	let newPost;
  	return BlogPost.findOne()
  	.then(function(_newPost){
  		newPost = _newPost;
  		return chai.request(app).delete(`/posts/${newPost.id}`);
  	})
  	.then(function(res){
  		expect(res).to.have.status(204);
        return BlogPost.findById(newPost.id);
  	})
  	.then(function(_newPost){
  		expect(_newPost).to.be.null;
  	})
  });
  });
});