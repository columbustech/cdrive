from .models import CDriveFolder, CDriveFile, FolderPermission, FilePermission, HostedServiceFolderPermission, HostedServiceFolderPermission
from apps_api.models import CDriveApplication
from services_api.models import HostedService
from django.conf import settings

def get_object_by_path(path):
    tokens = path.split('/')
    parent = None
    for token in tokens:
        folderQuery = CDriveFolder.objects.filter(parent=parent, name=token)
        if folderQuery.exists():
            parent = folderQuery[0]
        else:
            fileQuery = CDriveFile.objects.filter(parent=parent, name=token)
            if fileQuery.exists():
                return fileQuery[0]
            else:
                return None
    return parent

def initialize_user_drive(cDriveUser):
    home_folder = CDriveFolder.objects.filter(name='users', parent=None, owner=None)[0]
    cDriveFolder = CDriveFolder(
        name = cDriveUser.username,
        parent = home_folder,
        owner = cDriveUser
    )
    cDriveFolder.save()
    cDriveApp = CDriveApplication(
        name = 'cdrive',
        client_id = settings.COLUMBUS_CLIENT_ID,
        client_secret = settings.COLUMBUS_CLIENT_SECRET,
        owner = cDriveUser
    )
    cDriveApp.save()

def check_folder_permission(cDriveFolder, cDriveUser, cDriveApp, permission):
    if permission == 'V' and cDriveFolder.is_public:
        return True
    else: 
        if cDriveApp.__class__.__name__ == 'CDriveApplication':
            return FolderPermission.objects.filter(
                cdrive_folder = cDriveFolder,
                user = cDriveUser,
                app = cDriveApp,
                permission = permission).exists()
        else:
            return HostedServiceFolderPermission.objects.filter(
                cdrive_folder = cDriveFolder,
                user = cDriveUser,
                service = cDriveApp,
                permission = permission).exists()

def check_file_permission(cDriveFile, cDriveUser, cDriveApp, permission):
    if permission == 'V' and cDriveFile.is_public:
        return True
    else:
        if cDriveApp.__class__.__name__ == 'CDriveApplication':
            return FilePermission.objects.filter(
                cdrive_file = cDriveFile,
                user = cDriveUser,
                app = cDriveApp,
                permission = permission).exists()
        else:
            return HostedServiceFilePermission.objects.filter(
                cdrive_file = cDriveFile,
                user = cDriveUser,
                service = cDriveApp,
                permission = permission).exists()

def check_permission_recursive(cDriveObject, cDriveUser, cDriveApp, permission):
    if (cDriveObject.__class__.__name__ == 'CDriveFolder'
        and check_folder_permission(cDriveObject, cDriveUser, cDriveApp, permission)):
        return True
    if (cDriveObject.__class__.__name__ == 'CDriveFile'
        and  check_file_permission(cDriveObject, cDriveUser, cDriveApp, permission)):
        return True
    parent = cDriveObject.parent
    if parent is None:
        return False
    else:
        return check_permission_recursive(parent, cDriveUser, cDriveApp, permission)

def check_permission(cDriveObject, cDriveUser, cDriveApp, permission):
    if cDriveUser is None or cDriveApp is None or cDriveObject is None:
        return False
    if cDriveObject.owner == cDriveUser and cDriveApp.name == 'cdrive':
        return True
    if check_permission_recursive(cDriveObject, cDriveUser, cDriveApp, 'E'):
        return True
    if permission == 'V' and check_permission_recursive(cDriveObject, cDriveUser, cDriveApp, 'V'):
        return True
    return False

def check_child_permission(cDriveFolder, cDriveUser, cDriveApp):
    files = CDriveFile.objects.filter(parent=cDriveFolder)
    for f in files:
        if (check_file_permission(f, cDriveUser, cDriveApp, 'E')
            or check_file_permission(f, cDriveUser, cDriveApp, 'V')):
            return True
    folders = CDriveFolder.objects.filter(parent=cDriveFolder)
    for f in folders:
        if (check_folder_permission(f, cDriveUser, cDriveApp, 'E')
            or check_folder_permission(f, cDriveUser, cDriveApp, 'V')
            or check_child_permission(f, cDriveUser, cDriveApp)):
            return True
    return False

def delete_folder(cDriveFolder):
    CDriveFile.objects.filter(parent=cDriveFolder).delete()
    children = CDriveFolder.objects.filter(parent=cDriveFolder)
    for child in children:
        delete_folder(child)
    cDriveFolder.delete()

def share_object(cdrive_object, target_user, target_app, permission):
    if ((cdrive_object.__class__.__name__ == 'CDriveFile')
        and (target_app.__class__.__name__ == 'CDriveApplication')):
        file_permission = FilePermission(
            cdrive_file = cdrive_object,
            user = target_user,
            app = target_app,
            permission = permission
        )
        file_permission.save()
    elif ((cdrive_object.__class__.__name__ == 'CDriveFile')
        and (target_app.__class__.__name__ == 'HostedService')):
        file_permission = HostedServiceFilePermission(
            cdrive_file = cdrive_object,
            user = target_user,
            service = target_app,
            permission = permission
        )
        file_permission.save()
    elif ((cdrive_object.__class__.__name__ == 'CDriveFolder')
        and (target_app.__class__.__name__ == 'CDriveApplication')):
        folder_permission = FolderPermission(
            cdrive_folder = cdrive_object,
            user = target_user,
            app = target_app,
            permission = permission
        )
        folder_permission.save()
    elif ((cdrive_object.__class__.__name__ == 'CDriveFolder')
        and (target_app.__class__.__name__ == 'HostedService')):
        folder_permission = FolderPermission(
            cdrive_folder = cdrive_object,
            user = target_user,
            service = target_app,
            permission = permission
        )
        folder_permission.save()
