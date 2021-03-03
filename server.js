'use strict';
//.env
require('dotenv').config();
//define express 
const express = require('express');

//override
const methodOverride = require('method-override');


const pg = require("pg")

const superagent = require('superagent')
const PORT = process.env.PORT || 4000
const server = express();
let client = '';
if (PORT == 3000 || PORT == 3050) {
    client = new pg.Client(process.env.DATABASE_URL);
} else {
    client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}


server.use(express.static('./public'));

server.use(express.urlencoded({ extended: true }));

server.use(methodOverride('_method'));


server.set('view engine', 'ejs');
//home rout
server.get('/', handelHome)
//to do new search
server.get('/searches/new', handleSearch)
//show result
server.post('/searches', SearchResult)
// details for single book
server.get('/books/:id', bookDetails)
// insert data to DB
server.post('/books', selectBook)
//ubdate book details
server.put('/books/:id', updateBook)
// delete book
server.delete('/books/:id', deleteBook)



//functions
function handleSearch(req, res) {
    res.render('pages/searches/new')
}

function SearchResult(req, res) {
    let search = req.body.search;
    let searchBy = req.body.searchBy;
    let url = `https://www.googleapis.com/books/v1/volumes?q=+${searchBy}:${search}`;
    superagent.get(url)
        .then(result => {
            let books = result.body.items.map(data => {
                return new Book(data);
            })
            res.render('pages/searches/show', { allBooks: books });
        })
        .catch((error) => {
            errorHandler(error, req, res);
        })
}

function errorHandler(error, req, res) {
    let errObj = {
        status: 500,
        error: error
    }
    res.render('pages/error', { error: errObj });
}

function handelHome(req, res) {
    let SQL = `SELECT * FROM books;`
    client.query(SQL)
        .then(result => {
            res.render('pages/index', { allBooks: result.rows });
        })
}

function bookDetails(req, res) {
    let SQL = `SELECT * FROM books WHERE id=$1`
    let bookId = [req.params.id];
    console.log(bookId);
    client.query(SQL, bookId)
        .then(result => {
            res.render('pages/books/show', { allBooks: result.rows[0] })
        })
        .catch((error) => {
            errorHandler(error, req, res);
        });
}

function selectBook(req,res){
let {img,title,authors,description,isbn,bookshelf}=req.body;
let SQL=`INSERT INTO books (img,title,authors,description,isbn,bookshelf) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id;`;
let values=[img,title,authors,description,isbn,bookshelf];
client.query(SQL,values)
.then(bookId=>{
    res.redirect(`/books/${bookId.rows[0].id}`);
}) .catch((error) => {
    errorHandler(error, req, res);
});

}

function updateBook(req,res){
    let {img,title,authors,description,isbn,bookshelf}=req.body;
    let SQL = `UPDATE books SET img=$1, title=$2, authors=$3, description=$4, isbn=$5, bookshelf=$6
    WHERE id=$7;`
let values=[img,title,authors,description,isbn,bookshelf,req.params.id];
client.query(SQL,values)
.then(()=> res.redirect(`/books/${req.params.id}`))
.catch((error) => {
    errorHandler(error, req, res);
});
}

function deleteBook(req,res){
    let SQL=`DELETE FROM books WHERE id=$1`
    let value= [req.params.id];
    client.query(SQL,value)
    .then(()=> res.redirect('/'))
    .catch((error) => {
        errorHandler(error, req, res);
    });
}
//constructors
function Book(data) {
    this.img = (data.volumeInfo.imageLinks) ? data.volumeInfo.imageLinks.thumbnail : `https://i.imgur.com/J5LVHEL.jpg`;
    this.title = (data.volumeInfo.title) ? data.volumeInfo.title : `Title unavilable`;
    this.authors = (Array.isArray(data.volumeInfo.authors)) ? data.volumeInfo.authors.join(', ') : `Author unavilable`;
    this.description = (data.volumeInfo.description) ? data.volumeInfo.description : `description unavilable`;
    this.isbn = (data.volumeInfo.industryIdentifiers) ? data.volumeInfo.industryIdentifiers[0].identifier : `ISBN unavilable`;
    this.bookshelf = (data.volumeInfo.categories) ? data.volumeInfo.categories[0] : `This book not on shelf`;
}

client.connect()
    .then(
        server.listen(PORT, () => {
            console.log(`listen to PORT: ${PORT}`)
        }
        ))

