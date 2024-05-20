import { Note } from './components/note'

function App() {
  return (
    <>
      <Note />
      <footer className='text-center my-5 text-gray-500 dark:text-gray-400 font-mono text-xs'>
        <p>
          &copy; 2024 <a target='_blank' href="https://github.com/youxam" className='text-blue-500 dark:text-blue-400'>YouXam</a>
        </p>
      </footer>
    </>
  )
}

export default App
