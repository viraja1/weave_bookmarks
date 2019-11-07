import React, {Component} from 'react';
import {Card} from 'react-bootstrap';
import {FaTrash, FaExternalLinkAlt} from 'react-icons/fa';
import StackGrid from 'react-stack-grid';
import sizeMe from 'react-sizeme';

class ListBookmarks extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchFilter: ''
    }
  }

  truncate(s, max) {
    if (s.length > max) {
      s = s.slice(0, max) + "...";
    }
    return s;
  }

  setSearchFilter(e){
    this.setState({searchFilter: e.target.value})
  }

  render() {
    const {bookmarks, isLoading, tag, deleteBookmark, size} = this.props;
    const { width} = size;
    return (
      <div className="col-md-12 bookmarks">
        <br/>
        <p className="h3" style={{textTransform: 'capitalize'}}>{tag} Bookmarks</p>
        {isLoading && <span>Fetching Bookmarks...</span>}
        {bookmarks.length > 0 &&
          <div style={{float: "right"}}>
            <input type="text" className="form-control-sm" placeholder="Search" onChange={this.setSearchFilter.bind(this)}/>
          </div>
        }
        <br/>
        <br/>
        <StackGrid columnWidth={width <= 768 ? '100%' : '33.33%'} gutterWidth={10} gutterHeight={10} duration={0}>
          {bookmarks
            .filter(bookmark => bookmark.tags.includes(tag) || tag === "all")
            .filter(bookmark => bookmark.title.toLowerCase().search(this.state.searchFilter.toLowerCase().trim()) !== -1
              ||  bookmark.description.toLowerCase().search(this.state.searchFilter.toLowerCase().trim()) !== -1
              || this.state.searchFilter.trim() === "" )
            .map((bookmark) => (

            <Card key={bookmark.id + width}>
              <Card.Body>
                <Card.Title style={{textTransform: 'capitalize'}}>{this.truncate(bookmark.title, 1000)}</Card.Title>
                <Card.Text>
                  {this.truncate(bookmark.description, 1000)}
                </Card.Text>
                {bookmark.tags.length > 0 &&
                <Card.Text>
                  Tag: {this.truncate(bookmark.tags, 100)}
                </Card.Text>
                }
                <a href={bookmark.url.indexOf('http') === -1 ? "//" + bookmark.url : bookmark.url} target="_blank"><FaExternalLinkAlt/></a>
                <div style={{float: 'right'}}>
                  <FaTrash onClick={e => window.confirm("Are you sure you want to delete this bookmark?") && deleteBookmark(e, bookmark.id)} style={{cursor: 'pointer'}}/>
                </div>
              </Card.Body>
            </Card>
            )
          )}
        </StackGrid>
        {!isLoading && !bookmarks.length && <span>Add a bookmark to get started</span>}
        <br/>
      </div>
    )
  }
}

export default sizeMe({monitorHeight: true})(ListBookmarks);
