var admissionsApp = angular.module('admissions',[]);

admissionsApp.controller('CustomApplicationEditorController', ['$scope', '$http', function($scope, $http) {
    
    $scope.application_template = {};
    $scope.applicant_field_options = [];
    $scope.applicant_integrated_fields = [];
    $scope.integratedField={};
    $scope.is_custom_field_new = true;
    $scope.custom_field_current_id = null;

    $scope.customField = {
        "custom_option" : "custom",
        "is_field_integrated_with_applicant" : false,
        "field_choices" : "",
        "field_type" : "",
        "field_name" : "",
        "field_label": "",
        "helptext" : ""
    };

    $scope.isNewFieldIntegrated = function() {
        if ( $scope.customField.custom_option == 'integrated' ) {
            return true;
        } else {
            return false;
        }
    };

    

    $scope.isNewFieldCustom = function() {
        return !$scope.isNewFieldIntegrated();
    };

    $scope.updateIntegratedFieldChoice = function(field) {
        var integrated_field = $scope.integratedField.data;
        $scope.customField.field_name = integrated_field.name;
        var field_type = $scope.get_html_input_type(integrated_field.type);
        $scope.customField.field_type = field_type;
        $scope.customField.field_label = integrated_field.label;
        $scope.customField.is_field_integrated_with_applicant = true;
        $scope.customField.custom_option = 'integrated';
    };

    $scope.getCustomFieldById = function(field_id) {
        for (var i=0; i < $scope.applicant_field_options.length; i ++ ) {
            var field = $scope.applicant_field_options[i];
            if ( field.id == field_id ) {
                return field;
                break;
            }
        }
    };

    $scope.getApplicantFieldByFieldName = function(field_name) {
        for (var i=0; i < $scope.applicant_integrated_fields.length; i ++ ) {
            var field = $scope.applicant_integrated_fields[i];
            if ( field.name == field_name ) {
                return field;
                break;
            }
        }
    };

    $scope.populateEditorWithExistingCustomField = function(field) {
        $scope.customField = $scope.getCustomFieldById(field.id);
        if ( $scope.customField.is_field_integrated_with_applicant ) {
            $scope.customField.custom_option = 'integrated';
            // we need to make sure the select-list on the modal form
            // displays the correct selection
            $scope.integratedField.data = $scope.getApplicantFieldByFieldName($scope.customField.field_name);
        } else {
            $scope.customField.custom_option = 'custom';
        }
    };

    // we need to map django field types to html field types
    $scope.get_html_input_type = function(django_type) {
        if ( django_type == 'choice' ) {
            return 'multiple';
        } else {
            return 'input';
        }
    };

    $scope.editCustomField = function(field) {
        var editModal = $("#editFieldModal");
        $scope.populateEditorWithExistingCustomField(field);
        $scope.is_custom_field_new = false;
        $scope.custom_field_current_id = field.id;
        editModal.modal('show');
    };

    $scope.newCustomFieldButtonClicked = function() {
        $scope.is_custom_field_new = true;
    };

    $scope.saveNewCustomField = function() {
        var saveButton = $("#save-change-button");
        var editModal = $("#editFieldModal");
        saveButton.addClass("disabled");
        saveButton.html('Saving...');
        var data = $scope.customField;
        if (data.custom_option == 'integrated') {
            data.is_field_integrated_with_applicant = true;
        } else {
            data.is_field_integrated_with_applicant = false;
        }
        if ( $scope.is_custom_field_new === true) {
            $http.post('/api/applicant-custom-field/', data).
              success(function(data, status, headers, config) {
                $scope.refreshCustomFieldList();
              });
        } else if ( $scope.is_custom_field_new === false ) {
            var url = '/api/applicant-custom-field/' + $scope.custom_field_current_id;
            $http.put(url, data).
              success(function(data, status, headers, config) {
                $scope.refreshCustomFieldList();
              });
        }
        saveButton.removeClass("disabled");
        saveButton.html('Save changes');
        editModal.modal('hide')
    };

    $scope.refreshCustomFieldList = function() {
        $http.get("/api/applicant-custom-field")
            .success(function(data, status, headers, config) {
                $scope.applicant_field_options = data;
        });
    };

    $scope.init = function() {
        $http.get("/api/application-template/1/")
            .success(function(data, status, headers, config) {
                json_template = JSON.parse(data.json_template)
                if (!json_template.sections) {
                    $scope.application_template = {"sections" : []};
                } else {
                    $scope.application_template = json_template;
                }
        });

        $scope.refreshCustomFieldList();

        $http({
            method: "OPTIONS",
            url: "/api/applicant/",
        }).success(function(data, status, headers, config){
            // generate a list of fields from the Applicant Django model
            var integrated_fields = data.actions.POST;
            for (var field_name in integrated_fields) {
                var field = integrated_fields[field_name];
                $scope.applicant_integrated_fields.push({
                    "name" : field_name, 
                    "required" : field.required,
                    "label" : field.label,
                    "type" : field.field_type,
                    "choices" : field.choices,
                    "max_length" : field.max_length,
                });
            };  
        });
    };

    $scope.moveUp = function(your_list, item) {
        // move the specified item up one in your_list
        var index_of_item = your_list.indexOf(item);
        if (index_of_item != 0) {
            var index_of_item_above = index_of_item - 1;
            var item_above = your_list[index_of_item_above];
            // swap this item with the item above
            your_list[index_of_item] = item_above;
            your_list[index_of_item_above] = item;
        }
    };

    $scope.moveDown = function(your_list, item) {
        // move the specified item down one in your_list
        var index_of_item = your_list.indexOf(item);
        var index_of_last_item = your_list.length - 1;
        if (index_of_item != index_of_last_item) {
            var index_of_item_below = index_of_item + 1;
            var item_below = your_list[index_of_item_below];
            // swap this item with the item below
            your_list[index_of_item] = item_below;
            your_list[index_of_item_below] = item;
        }
    };

    $scope.generateUniqueSectionId = function() {
        var list_of_current_section_ids = [];
        var sections = $scope.application_template.sections;
        for (var i = 0; i < sections.length; i++) {
            list_of_current_section_ids.push(sections[i].id);
        }
        var new_id = 0;
        while (list_of_current_section_ids.indexOf(new_id) != -1) {
            new_id += 1;
        }
        return new_id;
    };

    $scope.newSection = function() {
        $scope.application_template.sections.push({
            "name": "New Section",
            "id" : $scope.generateUniqueSectionId(),
            "fields" : [],
        });
    };

    $scope.removeSectionField = function(section, field) {
        var index_of_field = section.fields.indexOf(field);
        section.fields.splice(index_of_field, 1);
    };

    $scope.isFieldAlreadyInSection = function(section, field) {
        var status = false;
        for (i in section.fields) {
            var existing_field = section.fields[i];
            if (existing_field.id == field.id) {
                status = true;
                break;
            }
        }
        return status;
    };

    $scope.addSectionField = function(section, field) {
        if ( !$scope.isFieldAlreadyInSection(section, field) ) {
            section.fields.push({
                "id" : field.id
            });
        }
    };  

    $scope.saveApplicationTemplate = function() {
        var url = '/api/application-template/1/';
        var data = {
            "name" : "default application",
            "is_default" : true,
            "json_template" : JSON.stringify($scope.application_template)
        };
        $.ajax({
            type: "PUT",
            data: data,
            url: url
        });
    };
}]);