import logo from './logo.svg';
import './App.css';
import Home from './Home';

function App() {
  const [state, setState] = useState(
    loadStateFromLocalStorage() || initialState
  );

  const saveStateToLocalStorage = state => {
    try {
      const serializedState = JSON.stringify(state);
      localStorage.setItem('app_state', serializedState);
    } catch (e) {
      // Handle errors
    }
  };

  const loadStateFromLocalStorage = () => {
    try {
      const serializedState = localStorage.getItem('app_state');
      if (serializedState === null) {
        return undefined; // No state saved
      }
      return JSON.parse(serializedState);
    } catch (e) {
      return undefined; // Errors handled, return undefined to use initial state
    }
  };

  useEffect(() => {
    saveStateToLocalStorage(state);
  }, [state]);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <Home />
      </header>
    </div>
  );
}

export default App;
