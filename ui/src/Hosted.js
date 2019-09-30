import React from 'react';

class Hosted extends React.Component {
  render() {
    let links =  
      <li>
        <a href="">Rule Executor</a>
      </li> ;
    return(
      <div className="applications-container" >
        <ul>
          {links}
        </ul>
      </div>
    );
  }
}

export default Hosted;
