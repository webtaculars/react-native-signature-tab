"use strict";

import React, { Component } from "react";
import { View, WebView, StyleSheet, ViewPropTypes } from "react-native";
import PropTypes from "prop-types";

import htmlContent from "./injectedHtml";
import injectedSignaturePad from "./injectedJavaScript/signaturePad";
import injectedApplication from "./injectedJavaScript/application";
import injectedErrorHandler from "./injectedJavaScript/errorHandler";
import injectedExecuteNativeFunction from "./injectedJavaScript/executeNativeFunction";

class SignaturePad extends Component {
  static propTypes = {
    onChange: PropTypes.func,
    onError: PropTypes.func,
    style: ViewPropTypes.style,
    penColor: PropTypes.string,
    dataURL: PropTypes.string
  };

  static defaultProps = {
    onChange: () => {},
    onError: () => {},
    style: {}
  };

  constructor(props) {
    super(props);
    this.state = { base64DataUrl: props.dataURL || null };
    const { backgroundColor } = StyleSheet.flatten(props.style);
    var injectedJavaScript =
      injectedExecuteNativeFunction +
      injectedErrorHandler +
      injectedSignaturePad +
      injectedApplication(props.penColor, backgroundColor, props.dataURL);
    var html = htmlContent(injectedJavaScript);
    this.source = { html };
  }

  _onNavigationChange = args => {
    this._parseMessageFromWebViewNavigationChange(unescape(args.url));
  };

  _parseMessageFromWebViewNavigationChange = newUrl => {
    var hashUrlIndex = newUrl.lastIndexOf("#");
    if (hashUrlIndex === -1) {
      return;
    }

    var hashUrl = newUrl.substring(hashUrlIndex);
    hashUrl = decodeURIComponent(hashUrl);
    var regexFindAllSubmittedParameters = /&(.*?)&/g;

    var parameters = {};
    var parameterMatch = regexFindAllSubmittedParameters.exec(hashUrl);
    if (!parameterMatch) {
      return;
    }

    while (parameterMatch) {
      var parameterPair = parameterMatch[1];
      var parameterPairSplit = parameterPair.split("<-");
      if (parameterPairSplit.length === 2) {
        parameters[parameterPairSplit[0]] = parameterPairSplit[1];
      }

      parameterMatch = regexFindAllSubmittedParameters.exec(hashUrl);
    }

    if (!this._attemptToExecuteNativeFunctionFromWebViewMessage(parameters)) {
      logger.warn(
        { parameters, hashUrl },
        "Received an unknown set of parameters from WebView"
      );
    }
  };

  _attemptToExecuteNativeFunctionFromWebViewMessage = message => {
    if (message.executeFunction && message.arguments) {
      var parsedArguments = JSON.parse(message.arguments);

      var referencedFunction = this["_bridged_" + message.executeFunction];
      if (typeof referencedFunction === "function") {
        referencedFunction.apply(this, [parsedArguments]);
        return true;
      }
    }

    return false;
  };

  _bridged_jsError = args => {
    this.props.onError({ details: args });
  };

  _bridged_finishedStroke = ({ base64DataUrl }) => {
    this.props.onChange({ base64DataUrl });
    this.setState({ base64DataUrl });
  };

  _renderError = args => {
    this.props.onError({ details: args });
  };

  _renderLoading = args => {};

  render = () => {
    return (
      <WebView
        automaticallyAdjustContentInsets={false}
        onNavigationStateChange={this._onNavigationChange}
        renderError={this._renderError}
        renderLoading={this._renderLoading}
        source={this.source}
        javaScriptEnabled={true}
        style={this.props.style}
      />
    );
  };
}

module.exports = SignaturePad;
