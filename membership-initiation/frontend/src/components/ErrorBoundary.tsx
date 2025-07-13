import React, { Component, ErrorInfo, ReactNode } from 'react';

// Import official logos
import companyLogo from "../assets/WhyteHoux.png";
import projectLogo from "../assets/PNG image 5.png";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Error info:', errorInfo);

    // You could log to an error reporting service here
    // Example: reportErrorToService(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 border border-gray-200">
            <div className="flex justify-center items-center mb-6">
              <img
                src={companyLogo}
                alt="WhyteHoux"
                className="h-8 mr-3"
                title="WhyteHoux"
              />
              <img
                src={projectLogo}
                alt="Space Project"
                className="h-10"
                title="Space Project"
              />
            </div>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Something went wrong</h2>
              <p className="text-gray-600">
                An error occurred in this component. Please try refreshing the page.
              </p>
            </div>
            
            {this.state.error && (
              <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-6">
                <p className="text-sm text-red-800 font-mono overflow-auto max-h-36">
                  {this.state.error.message || 'Unknown error'}
                </p>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
          
          <p className="mt-6 text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Space Project. All rights reserved.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}