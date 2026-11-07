import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', direction: 'rtl' }}>
          <h2 style={{ color: '#333', marginBottom: '16px', fontSize: '24px' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#666', marginBottom: '24px', fontSize: '16px' }}>
            We're sorry, but an unexpected error occurred.
          </p>
          {this.state.error && (
            <details style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', color: '#333' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px', fontWeight: 'bold' }}>
                Error details (click to expand)
              </summary>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '16px', 
                borderRadius: '4px', 
                overflow: 'auto',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null })
              window.location.reload()
            }}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary