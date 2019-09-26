import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { withRouter } from 'react-router-dom';
import { injectIntl } from 'react-intl';
import { Button, Input, Breadcrumb } from '@scality/core-ui';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { isEmpty } from 'lodash';
import semver from 'semver';
import { editVersionServerAction } from '../ducks/app/versionServer';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink
} from '../components/BreadcrumbStyle';

const CreateVersionServerContainter = styled.div`
  height: 100%;
  padding: ${padding.base};
  display: inline-block;
`;

const CreateVersionServerLayout = styled.div`
  height: 100%;
  overflow: auto;
  display: inline-block;
  margin-top: ${padding.base};
  form {
    .sc-input {
      margin: ${padding.smaller} 0;
      .sc-input-label {
        width: 150px;
        box-sizing: border-box;
      }
      .sc-select,
      .sc-input-type {
        width: 200px;
        box-sizing: border-box;
      }
    }
  }
`;

const InputLabel = styled.label`
  width: 150px;
  padding: 10px;
  font-size: ${fontSize.base};
  box-sizing: border-box;
`;

const InputContainer = styled.div`
  display: inline-flex;
  align-items: center;
`;

const ActionContainer = styled.div`
  display: flex;
  margin: ${padding.large} 0;
  justify-content: flex-end;

  button {
    margin-left: ${padding.large};
  }
`;

const FormSection = styled.div`
  padding: 0 ${padding.larger};
  display: flex;
  flex-direction: column;
`;

const InputValue = styled.label`
  width: 200px;
  font-weight: bold;
  font-size: ${fontSize.large};
`;

const VersionServerEditForm = props => {
  const { intl, match, versionServers, config } = props;
  const stack = match.params.name;
  const versionServer = versionServers.find(cr => cr.name === match.params.id);
  const initialValues = {
    version: versionServer ? versionServer.version : '',
    replicas: versionServer ? versionServer.replicas : '',
    name: versionServer ? versionServer.name : '',
    stack
  };

  const validationSchema = Yup.object().shape({
    version: Yup.string()
      .required()
      .test('is-version-valid', intl.messages.not_valid_version, value =>
        semver.valid(value)
      ),
    replicas: Yup.number().required()
  });

  return (
    <CreateVersionServerContainter>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={config.theme.brand.secondary}
          paths={[
            <StyledLink to="/stacks">{intl.messages.stacks} </StyledLink>,
            <StyledLink to={`/stacks/${stack}`}>{stack}</StyledLink>,
            <BreadcrumbLabel title={intl.messages.edit_version_server}>
              {intl.messages.edit_version_server}
            </BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <CreateVersionServerLayout>
        {versionServer ? (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={props.editversionServer}
          >
            {formProps => {
              const {
                values,
                touched,
                errors,
                setFieldTouched,
                setFieldValue
              } = formProps;

              //handleChange of the Formik props does not update 'values' when field value is empty
              const handleChange = field => e => {
                const { value, checked, type } = e.target;
                setFieldValue(
                  field,
                  type === 'checkbox' ? checked : value,
                  true
                );
              };
              const handleSelectChange = field => selectedObj => {
                setFieldValue(field, selectedObj.value);
              };
              //get the select item from the object array
              const getSelectedObjectItem = (items, selectedValue) => {
                return items.find(item => item.value === selectedValue);
              };
              //touched is not "always" correctly set
              const handleOnBlur = e => setFieldTouched(e.target.name, true);
              const availableVersions = config.versions.map(item => {
                return {
                  label: item.version,
                  value: item.version
                };
              });
              return (
                <Form>
                  <FormSection>
                    <InputContainer>
                      <InputLabel>{intl.messages.name}</InputLabel>
                      <InputValue>{values.name}</InputValue>
                    </InputContainer>

                    <Input
                      label={intl.messages.version}
                      clearable={false}
                      type="select"
                      options={availableVersions}
                      placeholder={intl.messages.select_a_version}
                      noResultsText={intl.messages.not_found}
                      name="version"
                      onChange={handleSelectChange('version')}
                      value={getSelectedObjectItem(
                        availableVersions,
                        values.version
                      )}
                      error={touched.version && errors.version}
                      onBlur={handleOnBlur}
                    />
                    <Input
                      name="replicas"
                      label={intl.messages.replicas}
                      value={values.replicas}
                      onChange={handleChange('replicas')}
                      error={touched.replicas && errors.replicas}
                      onBlur={handleOnBlur}
                    />

                    <ActionContainer>
                      <div>
                        <div>
                          <Button
                            text={intl.messages.cancel}
                            type="button"
                            outlined
                            onClick={() =>
                              props.history.push(`/stacks/${stack}`)
                            }
                          />
                          <Button
                            text={intl.messages.edit}
                            type="submit"
                            disabled={!isEmpty(errors)}
                          />
                        </div>
                      </div>
                    </ActionContainer>
                  </FormSection>
                </Form>
              );
            }}
          </Formik>
        ) : null}
      </CreateVersionServerLayout>
    </CreateVersionServerContainter>
  );
};

function mapStateToProps(state) {
  return {
    config: state.config,
    versionServers: state.app.versionServer.list
  };
}

const mapDispatchToProps = dispatch => {
  return {
    editversionServer: body => dispatch(editVersionServerAction(body))
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(VersionServerEditForm)
  )
);
