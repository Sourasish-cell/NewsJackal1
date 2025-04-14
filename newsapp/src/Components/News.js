import React, { Component } from 'react'
import Newsitem from './Newsitem'
import { ThemeContext } from '../context/ThemeContext'
import Spinner from './spinner'
import PropTypes from 'prop-types'
import { sampleArticles } from '../data/sampleData'
import InfiniteScroll from 'react-infinite-scroll-component'

// API base URL - points directly to Flask backend
const API_BASE = 'http://localhost:5000/api';

export class News extends Component {
  static contextType = ThemeContext;
  static defaultProps = {
    pageSize: 9,
    category: 'general'
  }

  static propTypes = {
    pageSize: PropTypes.number,
    category: PropTypes.string,
    setProgress: PropTypes.func
  }

  constructor(props){
    super(props);
    this.state = {
      articles: sampleArticles,
      loading: false,
      page: 1,
      totalResults: sampleArticles.length,
      apiError: false,
      errorMessage: "",
      errorShown: false,
      hasMore: true,
      backendAvailable: false,
      sources: [],
      selectedSource: '' // Empty string means 'all sources'
    }
    document.title = `${this.capitalizeFirstLetter(this.props.category)} - NewsJackal`;
  }

  async componentDidMount() {
    if (this.props.setProgress) this.props.setProgress(10);

    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'; // Updated fallback
    console.log("Using API_BASE:", API_BASE);

    try {
      console.log("Checking backend health at:", `${API_BASE}/health`); // Note: Vercel uses /api/health
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        console.log("Backend health check passed:", await response.json());
        this.setState({ backendAvailable: true });
        await this.fetchSources();
        await this.fetchNews();
      } else {
        console.error("Backend health check failed:", response.status, await response.text());
        this.setState({ backendAvailable: false, apiError: true, errorMessage: "Backend health check failed" });
      }
    } catch (error) {
      console.error("Backend connection error:", error.message);
      this.setState({ backendAvailable: false, apiError: true, errorMessage: "Backend connection error" });
    }

    if (this.props.setProgress) this.props.setProgress(100);
  }

  async componentDidUpdate(prevProps) {
    if (prevProps.category !== this.props.category) {
      document.title = `${this.capitalizeFirstLetter(this.props.category)} - NewsJackal`;

      if (this.props.setProgress) {
        this.props.setProgress(10);
      }

      this.setState({ page: 1, articles: [], errorShown: false, hasMore: true }, () => {
        this.fetchNews();
      });
    }
  }

  fetchSources = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sources`);
      const sources = await response.json();
      this.setState({ sources });
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  }

  handleSourceChange = (e) => {
    const selectedSource = e.target.value;
    this.setState({ 
      selectedSource,
      page: 1,
      articles: [],
      errorShown: false,
      hasMore: true 
    }, () => {
      this.fetchNews();
    });
  }

  fetchNews = async () => {
    this.setState({ loading: true });

    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'; // Updated fallback
    if (!this.state.backendAvailable) {
      console.warn("Backend unavailable, using sample data");
      this.setState({
        articles: sampleArticles,
        totalResults: sampleArticles.length,
        loading: false,
        apiError: true,
        errorMessage: "Using sample data due to backend unavailability",
        hasMore: false
      });
      return;
    }

    let apiEndpoint = `${API_BASE}/top-headlines`; // Matches Vercel function name
    let queryParams = new URLSearchParams();
    queryParams.append('category', this.props.category);
    if (this.state.selectedSource) queryParams.append('source', this.state.selectedSource);
    queryParams.append('page', this.state.page);
    queryParams.append('pageSize', this.props.pageSize);
    const url = `${apiEndpoint}?${queryParams.toString()}`;
    console.log("Fetching news from:", url);

    try {
      const response = await fetch(url);
      console.log("Fetch response status:", response.status);
      const parsedData = await response.json();
      console.log("Fetch response data:", parsedData);

      if (parsedData.status === "ok" && parsedData.articles && parsedData.articles.length > 0) {
        this.setState(prevState => ({
          articles: this.state.page === 1 ? parsedData.articles : [...prevState.articles, ...parsedData.articles],
          totalResults: parsedData.totalResults,
          loading: false,
          apiError: false,
          errorMessage: "",
          hasMore: this.state.page === 1 ? parsedData.articles.length < parsedData.totalResults : prevState.articles.length + parsedData.articles.length < parsedData.totalResults
        }), () => {
          if (this.props.setProgress) this.props.setProgress(100);
        });
      } else {
        console.error("No articles or API error:", parsedData.message);
        this.setState({
          articles: sampleArticles,
          totalResults: sampleArticles.length,
          loading: false,
          apiError: true,
          errorMessage: parsedData.message || "No articles found",
          hasMore: false
        });
      }
    } catch (error) {
      console.error("Network error:", error.message);
      this.setState({
        articles: sampleArticles,
        totalResults: sampleArticles.length,
        loading: false,
        apiError: true,
        errorMessage: "Network error",
        hasMore: false
      });
    }
  }

  fetchMoreData = async () => {
    if (this.state.hasMore) {
      this.setState({ page: this.state.page + 1 }, () => {
        this.fetchNews();
      });
    }
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  render() {
    const { darkMode } = this.context;

    if (this.state.apiError && !this.state.errorShown) {
      setTimeout(() => {
        this.setState({ errorShown: true });
      }, 0);
    }

    return (
      <div className={`container my-3 ${darkMode ? 'text-light' : ''}`}>
        <h1 className="text-center" style={{ marginTop: '20px', marginBottom: '20px' }}>
          <strong>NewsJackal - Top {this.capitalizeFirstLetter(this.props.category)} Headlines</strong>
        </h1>

        {/* Source selector */}
        {this.state.sources.length > 0 && (
          <div className="row mb-4">
            <div className="col-md-6 mx-auto">
              <div className="input-group">
                <div className="input-group-prepend">
                  <label className="input-group-text" htmlFor="sourceSelector"><strong>News Source</strong></label>
                </div>
                <select 
                  className={`form-select ${darkMode ? 'bg-dark text-light' : ''}`} 
                  id="sourceSelector"
                  value={this.state.selectedSource}
                  onChange={this.handleSourceChange}
                >
                  <option value="">All Sources</option>
                  {this.state.sources.map(source => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {this.state.apiError && !this.state.errorShown && (
          <div className="alert alert-warning" role="alert">
            <strong>API Error:</strong> {this.state.errorMessage}. Showing sample data instead.
          </div>
        )}

        <InfiniteScroll
          dataLength={this.state.articles.length}
          next={this.fetchMoreData}
          hasMore={this.state.hasMore}
          loader={<Spinner />}
        >
          <div className="row">
            {this.state.articles && this.state.articles.map((element, index) => {
              return (
                <div className="col-md-4 mb-4" key={element.url || index}>
                  <Newsitem 
                    title={element.title || ""} 
                    description={element.description || ""} 
                    imageUrl={element.urlToImage} 
                    newsUrl={element.url} 
                    darkMode={darkMode}
                    author={element.author}
                    date={element.publishedAt}
                    source={element.source?.name || "Unknown"}
                  />
                </div>
              );
            })}
          </div>
        </InfiniteScroll>
      </div>
    );
  }
}

export default News
