/**
 * Contains the schema for all Entities within the DB
 * 
 * @author Liam Costello
 */
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var GameSession = new Schema({
	id    : ObjectId
  , name : String
  , creation_date  : Date
});