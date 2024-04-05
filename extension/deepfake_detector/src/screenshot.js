const [ screenshotUrl, setScreenshotUrl ] = useState("")
const handleClick = async() => {
  const url = await chrome.tabs.captureVisibleTab()
  console.log(url)
  setScreenshotUrl(url)
}
