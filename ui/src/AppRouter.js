import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect} from 'react-router-dom';
import App from './App';
import CsvBrowser from './CsvBrowser';

class AppRouter extends React.Component {
    render() {
        return(
          <Router>
            <Switch>
              <Route path='/csvbrowser/' component={CsvBrowser} />
              <Route path='/' component={App} />
              <Redirect from='*' to='/' />
              </Switch>
          </Router>
        );
    }
}

export default AppRouter;
